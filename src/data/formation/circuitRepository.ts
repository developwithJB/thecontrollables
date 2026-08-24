import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  CIRCUIT_TYPES,
  FORMATION_RULE_VERSION,
  isCircuitType,
  isTrainingTrack,
  type CircuitActionId,
  type CircuitCompletionState,
  type CircuitType,
  type FormationCircuitDraft,
  type FormationCircuitEntry,
  type TrainingTrack,
} from "@/domain/formation/circuits";
import { createCircuitIdempotencyKey, evaluateCircuit } from "@/domain/formation/circuitRules";
import { normalizeCircuitDraft, upsertFormationCircuitEntry } from "@/domain/formation/circuitSerialization";
import { refreshFormationProofPreview } from "./formationProof";

const LOCAL_STORAGE_VERSION = 1;
const VALID_COMPLETION_STATES: CircuitCompletionState[] = ["not_started", "in_progress", "recorded", "complete"];

interface StoredFormationCircuits {
  version: number;
  entries: FormationCircuitEntry[];
}

type CircuitRow = Awaited<ReturnType<typeof selectCircuitRows>>[number];

export interface SaveFormationCircuitInput {
  userId: string;
  localDate: string;
  track: TrainingTrack;
  circuit: CircuitType;
  draft: FormationCircuitDraft;
  contentVersionId?: string | null;
  localOnly: boolean;
}

export async function loadFormationCircuitHistory(
  userId: string,
  track: TrainingTrack,
  localOnly: boolean,
): Promise<FormationCircuitEntry[]> {
  if (localOnly) {
    return readLocalEntries(userId).filter((entry) => entry.track === track);
  }

  const rows = await selectCircuitRows(userId, track);
  const entries = rows.map(mapCircuitRow);

  return Promise.all(
    entries.map(async (entry) => {
      if (!entry.draft.proof || entry.draft.proof.localOnly) return entry;
      const proof = await refreshFormationProofPreview(entry.draft.proof);
      return { ...entry, draft: { ...entry.draft, proof } };
    }),
  );
}

async function selectCircuitRows(userId: string, track: TrainingTrack) {
  const { data, error } = await supabase
    .from("formation_circuit_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("track", track)
    .order("local_date", { ascending: false })
    .order("updated_at", { ascending: false })
    // One strict attempt contains 75 days × 5 circuits. Keep the whole active
    // attempt available for closeout/history instead of truncating after Day 24.
    .limit(500);

  if (error) throw error;
  return data ?? [];
}

export async function saveFormationCircuit(input: SaveFormationCircuitInput): Promise<FormationCircuitEntry> {
  const evaluation = evaluateCircuit(input.track, input.circuit, input.draft);
  const idempotencyKey = createCircuitIdempotencyKey(input.userId, input.localDate, input.track, input.circuit);
  const now = new Date().toISOString();

  if (input.localOnly) {
    const current = readLocalEntries(input.userId);
    const existing = current.find(
      (entry) =>
        entry.localDate === input.localDate &&
        entry.track === input.track &&
        entry.circuit === input.circuit,
    );
    const entry: FormationCircuitEntry = {
      id: existing?.id ?? idempotencyKey,
      userId: input.userId,
      localDate: input.localDate,
      track: input.track,
      circuit: input.circuit,
      ruleVersion: FORMATION_RULE_VERSION,
      completionState: evaluation.state,
      completedActionIds: evaluation.completedActionIds,
      missingRequiredActionIds: evaluation.missingRequiredActionIds,
      draft: normalizeCircuitDraft(input.draft),
      idempotencyKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt:
        evaluation.state === "recorded" || evaluation.state === "complete"
          ? existing?.completedAt ?? now
          : null,
      contentVersionId: input.contentVersionId ?? existing?.contentVersionId ?? null,
      localOnly: true,
    };
    const next = upsertFormationCircuitEntry(current, entry);
    writeLocalEntries(input.userId, next);
    return entry;
  }

  const payload = serializeDraft(input.draft);
  const { data, error } = await supabase.rpc("save_formation_circuit", {
    p_local_date: input.localDate,
    p_track: input.track,
    p_circuit_type: input.circuit,
    p_rule_version: FORMATION_RULE_VERSION,
    p_completion_state: evaluation.state,
    p_completed_action_ids: evaluation.completedActionIds,
    p_missing_required_action_ids: evaluation.missingRequiredActionIds,
    p_payload: payload,
    p_idempotency_key: idempotencyKey,
    p_content_version_id: input.contentVersionId ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error("Formation circuit save returned no record");
  const entry = mapCircuitRow(data);
  return entry.draft.proof && !entry.draft.proof.localOnly
    ? { ...entry, draft: { ...entry.draft, proof: await refreshFormationProofPreview(entry.draft.proof) } }
    : entry;
}

function mapCircuitRow(row: CircuitRow): FormationCircuitEntry {
  const track = isTrainingTrack(row.track) ? row.track : "read_along";
  const circuit = isCircuitType(row.circuit_type) ? row.circuit_type : "awareness";
  const completionState = VALID_COMPLETION_STATES.includes(row.completion_state as CircuitCompletionState)
    ? (row.completion_state as CircuitCompletionState)
    : "not_started";

  return {
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    track,
    circuit,
    ruleVersion: row.rule_version,
    completionState,
    completedActionIds: normalizeActionIds(row.completed_action_ids),
    missingRequiredActionIds: normalizeActionIds(row.missing_required_action_ids),
    draft: normalizeCircuitDraft(row.payload),
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    contentVersionId: row.content_version_id,
    localOnly: false,
  };
}

function normalizeActionIds(value: unknown): CircuitActionId[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set(CIRCUIT_TYPES.flatMap((circuit) => CIRCUIT_DEFINITIONS_ACTION_IDS[circuit]));
  return value.filter((item): item is CircuitActionId => typeof item === "string" && valid.has(item as CircuitActionId));
}

const CIRCUIT_DEFINITIONS_ACTION_IDS: Record<CircuitType, CircuitActionId[]> = {
  awareness: ["scripture_opened", "reading_completed", "honest_truth_saved", "witness_objective_completed"],
  perspective: ["prayer_practiced", "gratitude_recorded", "control_release_move_recorded", "ego_signal_responded", "smaller_faithful_action"],
  habit: ["main_promise_named", "main_promise_completed", "recovery_reflection_recorded"],
  wellness: ["nutrition_covenant_honored", "hydration_covenant_honored", "movement_block_one", "movement_block_two", "outdoor_movement", "sleep_preparation", "adapted_movement"],
  environment: ["friction_removed", "tomorrow_prepared", "service_completed"],
};

function serializeDraft(draft: FormationCircuitDraft): Json {
  const normalized = normalizeCircuitDraft(draft);
  if (normalized.proof && !normalized.proof.localOnly) {
    normalized.proof = { ...normalized.proof, previewUrl: "" };
  }
  return normalized as unknown as Json;
}

function getLocalStorageKey(userId: string): string {
  return `formation_circuit_entries_v${LOCAL_STORAGE_VERSION}_${userId}`;
}

function readLocalEntries(userId: string): FormationCircuitEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredFormationCircuits>;
    if (parsed.version !== LOCAL_STORAGE_VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries
      .filter((entry) => entry && entry.userId === userId && isTrainingTrack(entry.track) && isCircuitType(entry.circuit))
      .map((entry) => ({ ...entry, draft: normalizeCircuitDraft(entry.draft), localOnly: true }));
  } catch {
    return [];
  }
}

function writeLocalEntries(userId: string, entries: FormationCircuitEntry[]): void {
  if (typeof window === "undefined") return;
  const payload: StoredFormationCircuits = {
    version: LOCAL_STORAGE_VERSION,
    // 75 strict days require 375 distinct circuit rows. Leave room for retries,
    // a prior ended attempt, and the other two formation tracks in local QA.
    entries: entries.slice(0, 1000),
  };
  localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(payload));
}
