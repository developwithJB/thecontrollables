import {
  DEFAULT_LOCAL_MISSION_PREFERENCES,
  normalizeLocalMissionPreferences,
  type LocalMissionPreferences,
} from "@/lib/localMissionDrop";
export interface LocalMissionDropState {
  preferences: LocalMissionPreferences;
  startedMissionIds: string[];
  completedAtByMissionId: Record<string, string>;
  dismissedPhotoProofMissionIds: string[];
}

export function normalizeMissionState(value: unknown): LocalMissionDropState {
  if (!value || typeof value !== "object") return createDefaultState();

  const source = value as Partial<LocalMissionDropState>;
  return {
    preferences: normalizeLocalMissionPreferences(source.preferences),
    startedMissionIds: Array.isArray(source.startedMissionIds)
      ? source.startedMissionIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    completedAtByMissionId:
      source.completedAtByMissionId &&
      typeof source.completedAtByMissionId === "object"
        ? Object.fromEntries(
            Object.entries(source.completedAtByMissionId).filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
          )
        : {},
    dismissedPhotoProofMissionIds: Array.isArray(
      source.dismissedPhotoProofMissionIds,
    )
      ? source.dismissedPhotoProofMissionIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  };
}

function createDefaultState(): LocalMissionDropState {
  return {
    preferences: { ...DEFAULT_LOCAL_MISSION_PREFERENCES },
    startedMissionIds: [],
    completedAtByMissionId: {},
    dismissedPhotoProofMissionIds: [],
  };
}
