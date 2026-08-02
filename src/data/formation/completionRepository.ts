import { supabase } from "@/integrations/supabase/client";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  createCompletionPreview,
  emptyClosingReflection,
  validateClosingReflection,
  type CompletionNextStep,
  type FormationCompletionRecord,
  type FormationCompletionReflection,
} from "@/domain/formation/completion";
import type { TrainingTrack } from "@/domain/formation/circuits";

const PREVIEW_REFLECTION_KEY = "formation_completion_preview_reflections_v1";

type CompletionRow = {
  id: string;
  user_id: string;
  track: string;
  completion_key: string;
  rule_version: string;
  content_version: string;
  started_on: string | null;
  completed_on: string;
  counts: unknown;
  created_at: string;
};

type ReflectionRow = {
  completion_record_id: string;
  answers: unknown;
  next_step: string | null;
  updated_at: string;
};

const asCount = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function normalizeCompletionRow(row: CompletionRow): FormationCompletionRecord {
  const counts = row.counts && typeof row.counts === "object" ? row.counts as Record<string, unknown> : {};
  return {
    id: row.id,
    userId: row.user_id,
    track: row.track as TrainingTrack,
    completionKey: row.completion_key,
    ruleVersion: row.rule_version,
    contentVersion: row.content_version,
    startedOn: row.started_on,
    completedOn: row.completed_on,
    counts: {
      datesPracticed: asCount(counts.datesPracticed),
      controllableReps: asCount(counts.controllableReps),
      scriptureProgress: asCount(counts.scriptureProgress),
      witnessProgress: asCount(counts.witnessProgress),
      promisesKept: asCount(counts.promisesKept),
      recoveryDecisions: asCount(counts.recoveryDecisions),
      serviceReps: asCount(counts.serviceReps),
      privateProofCount: asCount(counts.privateProofCount),
      formationSeasonsCompleted: asCount(counts.formationSeasonsCompleted),
    },
    createdAt: row.created_at,
    isPreview: false,
  };
}

function normalizeReflectionRow(row: ReflectionRow | null, recordId: string): FormationCompletionReflection {
  const rawAnswers = row?.answers && typeof row.answers === "object" ? row.answers as Record<string, string> : emptyClosingReflection();
  return {
    recordId,
    answers: validateClosingReflection({ ...emptyClosingReflection(), ...rawAnswers }),
    nextStep: (row?.next_step as CompletionNextStep | null) ?? null,
    updatedAt: row?.updated_at ?? new Date(0).toISOString(),
    localOnly: false,
  };
}

function readPreviewReflections(): Record<string, FormationCompletionReflection> {
  try {
    return JSON.parse(window.localStorage.getItem(PREVIEW_REFLECTION_KEY) ?? "{}") as Record<string, FormationCompletionReflection>;
  } catch {
    return {};
  }
}

export async function loadFormationCompletion(input: {
  userId: string;
  track: TrainingTrack;
  allowPreview: boolean;
}): Promise<{ record: FormationCompletionRecord | null; reflection: FormationCompletionReflection | null }> {
  if (!isDevMockAuthEnabled()) {
    const { data, error } = await supabase
      .from("formation_completion_records")
      .select("*")
      .eq("user_id", input.userId)
      .eq("track", input.track)
      .order("completed_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && !input.allowPreview) throw error;
    if (data) {
      const record = normalizeCompletionRow(data as CompletionRow);
      const { data: reflectionData, error: reflectionError } = await supabase
        .from("formation_completion_reflections")
        .select("completion_record_id, answers, next_step, updated_at")
        .eq("completion_record_id", record.id)
        .maybeSingle();
      if (reflectionError) throw reflectionError;
      return { record, reflection: normalizeReflectionRow(reflectionData as ReflectionRow | null, record.id) };
    }
  }

  if (!input.allowPreview) return { record: null, reflection: null };
  const record = createCompletionPreview(input.track);
  const reflection = readPreviewReflections()[record.id] ?? {
    recordId: record.id,
    answers: emptyClosingReflection(),
    nextStep: null,
    updatedAt: new Date(0).toISOString(),
    localOnly: true,
  };
  return { record, reflection };
}

export async function saveFormationCompletionReflection(
  record: FormationCompletionRecord,
  answers: FormationCompletionReflection["answers"],
  nextStep: CompletionNextStep | null,
): Promise<FormationCompletionReflection> {
  const normalized: FormationCompletionReflection = {
    recordId: record.id,
    answers: validateClosingReflection(answers),
    nextStep,
    updatedAt: new Date().toISOString(),
    localOnly: record.isPreview,
  };

  if (record.isPreview) {
    const values = readPreviewReflections();
    values[record.id] = normalized;
    window.localStorage.setItem(PREVIEW_REFLECTION_KEY, JSON.stringify(values));
    return normalized;
  }

  const { data, error } = await supabase.rpc("save_formation_completion_reflection", {
    p_completion_record_id: record.id,
    p_answers: normalized.answers,
    p_next_step: nextStep,
  });
  if (error) throw error;
  return normalizeReflectionRow(data as ReflectionRow, record.id);
}
