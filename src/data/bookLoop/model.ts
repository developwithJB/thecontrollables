import type { StartingChargeResult } from "@/lib/startingCharge";
import { normalizeProfile } from "./profile";
import { normalizeMissionState } from "./missions";
import {
  normalizeDexProofEntries,
  type DexProofEntry,
} from "@/lib/controllablesDex";
import { normalizeReadAlongProgress } from "@/lib/readAlong";
import {
  isTrainingTrack,
  type TrainingTrack,
} from "@/domain/formation/circuits";
import type { LocalProofEntry } from "@/lib/myControllables";

export interface CRMDraft {
  control: string;
  release: string;
  move: string;
  keptPromise: boolean;
}
export const normalizeCRM = (value: unknown): CRMDraft => {
  const v = (
    value && typeof value === "object" ? value : {}
  ) as Partial<CRMDraft>;
  return {
    control: typeof v.control === "string" ? v.control : "",
    release: typeof v.release === "string" ? v.release : "",
    move: typeof v.move === "string" ? v.move : "",
    keptPromise: v.keptPromise === true,
  };
};
export const normalizeTrack = (value: unknown): TrainingTrack =>
  isTrainingTrack(value) ? value : "read_along";
export const normalizeDex = (value: unknown): { entries: DexProofEntry[] } => ({
  entries: normalizeDexProofEntries(
    (value as { entries?: unknown } | null)?.entries,
  ),
});
export const normalizeStartingCharge = (
  value: unknown,
): { result: StartingChargeResult | null } => {
  const result = (value as { result?: StartingChargeResult } | null)?.result;
  return {
    result:
      result?.strongestControllable &&
      result?.chargingControllable &&
      result?.firstMission
        ? result
        : null,
  };
};
export const normalizers = {
  startingCharge: normalizeStartingCharge,
  profile: normalizeProfile,
  dex: normalizeDex,
  missions: normalizeMissionState,
  reading: normalizeReadAlongProgress,
  track: normalizeTrack,
  crm: normalizeCRM,
};
export type BookArea = keyof typeof normalizers;
export type BookState<A extends BookArea> = ReturnType<(typeof normalizers)[A]>;
export type BookKind = BookArea | "promise";
export interface BookRecord {
  kind: BookKind;
  record_key: string;
  payload: unknown;
  revision: number;
}
export interface BookChange {
  kind: BookKind;
  record_key: string;
  payload: unknown;
  expected_revision: number;
  delete?: boolean;
}
export const recordId = (row: Pick<BookRecord, "kind" | "record_key">) =>
  `${row.kind}:${row.record_key}`;
export const bookQueryKey = (userId: string) => ["book-loop", userId] as const;

export function decodeState<A extends BookArea>(
  area: A,
  key: string,
  rows: BookRecord[],
): BookState<A> {
  let value = rows.find(
    (r) => r.kind === area && r.record_key === key,
  )?.payload;
  if (area === "profile")
    value = {
      ...((value as object) || {}),
      proofEntries: rows
        .filter((r) => r.kind === "promise")
        .map((r) => r.payload)
        .sort((a: LocalProofEntry, b: LocalProofEntry) =>
          b.date.localeCompare(a.date),
        ),
    };
  if (area === "dex")
    value = {
      entries: rows.filter((r) => r.kind === "dex").map((r) => r.payload),
    };
  return normalizers[area](value) as BookState<A>;
}
export function encodeState<A extends BookArea>(
  area: A,
  key: string,
  state: BookState<A>,
): Omit<BookRecord, "revision">[] {
  if (area === "profile") {
    const { proofEntries, ...profile } = state as BookState<"profile">;
    return [
      { kind: "profile", record_key: key, payload: profile },
      ...proofEntries.map((entry) => ({
        kind: "promise" as const,
        record_key: entry.date,
        payload: entry,
      })),
    ];
  }
  if (area === "dex")
    return (state as BookState<"dex">).entries.map((entry) => ({
      kind: "dex",
      record_key: entry.id,
      payload: entry,
    }));
  return [{ kind: area, record_key: key, payload: state }];
}
export function changesForState<A extends BookArea>(
  area: A,
  key: string,
  before: BookRecord[],
  state: BookState<A>,
): BookChange[] {
  const relevant = before.filter((r) =>
    area === "profile"
      ? r.kind === "profile" || r.kind === "promise"
      : area === "dex"
        ? r.kind === "dex"
        : r.kind === area && r.record_key === key,
  );
  const next = encodeState(area, key, state);
  const changes: BookChange[] = [];
  for (const row of next) {
    const old = relevant.find((r) => recordId(r) === recordId(row));
    if (!old || JSON.stringify(old.payload) !== JSON.stringify(row.payload))
      changes.push({ ...row, expected_revision: old?.revision ?? 0 });
  }
  for (const old of relevant)
    if (!next.some((r) => recordId(r) === recordId(old)))
      changes.push({ ...old, expected_revision: old.revision, delete: true });
  return changes;
}
