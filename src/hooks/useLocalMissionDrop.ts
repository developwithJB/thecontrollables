import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeLocalMission,
  DEFAULT_LOCAL_MISSION_PREFERENCES,
  generateLocalMission,
  getLocalMissionDropStorageKey,
  getLocalMissionProofCopy,
  normalizeLocalMissionPreferences,
  type LocalMission,
  type LocalMissionCompletionResult,
  type LocalMissionPreferences,
} from "@/lib/localMissionDrop";

interface LocalMissionDropState {
  preferences: LocalMissionPreferences;
  startedMissionIds: string[];
  completedAtByMissionId: Record<string, string>;
  dismissedPhotoProofMissionIds: string[];
}

export function useLocalMissionDrop(userId: string | null | undefined) {
  const storageKey = useMemo(() => getLocalMissionDropStorageKey(userId), [userId]);
  const [state, setState] = useState<LocalMissionDropState>(() => readState(storageKey));

  useEffect(() => {
    setState(readState(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: LocalMissionDropState) => LocalMissionDropState) => {
      setState((current) => {
        const next = updater(current);
        writeState(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const baseMission = useMemo(
    () => generateLocalMission({ preferences: state.preferences }),
    [state.preferences],
  );
  const mission = useMemo(() => {
    if (!baseMission) return null;
    const completedAt = state.completedAtByMissionId[baseMission.id] ?? null;
    return {
      ...baseMission,
      completed: Boolean(completedAt),
      completedAt,
    };
  }, [baseMission, state.completedAtByMissionId]);

  const updatePreferences = useCallback(
    (preferences: Partial<LocalMissionPreferences>) => {
      persist((current) => ({
        ...current,
        preferences: normalizeLocalMissionPreferences({
          ...current.preferences,
          ...preferences,
        }),
      }));
    },
    [persist],
  );

  const enableLocalMissions = useCallback(
    (preferences: Pick<LocalMissionPreferences, "city" | "state" | "localMissionVisibility">) => {
      updatePreferences({
        ...preferences,
        localMissionsEnabled: true,
        showCityOnShareCards: false,
      });
    },
    [updatePreferences],
  );

  const startMission = useCallback(
    (missionId: string) => {
      persist((current) => ({
        ...current,
        startedMissionIds: current.startedMissionIds.includes(missionId)
          ? current.startedMissionIds
          : [...current.startedMissionIds, missionId],
      }));
    },
    [persist],
  );

  const dismissPhotoProof = useCallback(
    (missionId: string) => {
      persist((current) => ({
        ...current,
        dismissedPhotoProofMissionIds: current.dismissedPhotoProofMissionIds.includes(missionId)
          ? current.dismissedPhotoProofMissionIds
          : [...current.dismissedPhotoProofMissionIds, missionId],
      }));
    },
    [persist],
  );

  const completeMission = useCallback(
    (targetMission: LocalMission): LocalMissionCompletionResult => {
      const completedAt = state.completedAtByMissionId[targetMission.id] ?? null;
      const result = completeLocalMission({
        ...targetMission,
        completed: Boolean(completedAt),
        completedAt,
      });

      if (!result.alreadyCompleted && result.mission.completedAt) {
        persist((current) => ({
          ...current,
          startedMissionIds: current.startedMissionIds.includes(targetMission.id)
            ? current.startedMissionIds
            : [...current.startedMissionIds, targetMission.id],
          completedAtByMissionId: {
            ...current.completedAtByMissionId,
            [targetMission.id]: result.mission.completedAt!,
          },
        }));
      }

      return result;
    },
    [persist, state.completedAtByMissionId],
  );

  const isMissionStarted = mission ? state.startedMissionIds.includes(mission.id) : false;
  const isPhotoProofDismissed = mission ? state.dismissedPhotoProofMissionIds.includes(mission.id) : false;
  const proofCopy = mission ? getLocalMissionProofCopy(mission, state.preferences) : null;

  return {
    preferences: state.preferences,
    mission,
    isMissionStarted,
    proofCopy,
    updatePreferences,
    enableLocalMissions,
    startMission,
    dismissPhotoProof,
    completeMission,
    isPhotoProofDismissed,
  };
}

function readState(storageKey: string): LocalMissionDropState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function writeState(storageKey: string, state: LocalMissionDropState) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Local storage can be blocked or unavailable.
  }
}

function normalizeState(value: unknown): LocalMissionDropState {
  if (!value || typeof value !== "object") return createDefaultState();

  const source = value as Partial<LocalMissionDropState>;
  return {
    preferences: normalizeLocalMissionPreferences(source.preferences),
    startedMissionIds: Array.isArray(source.startedMissionIds)
      ? source.startedMissionIds.filter((id): id is string => typeof id === "string")
      : [],
    completedAtByMissionId:
      source.completedAtByMissionId && typeof source.completedAtByMissionId === "object"
        ? Object.fromEntries(
            Object.entries(source.completedAtByMissionId).filter(
              (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
          )
        : {},
    dismissedPhotoProofMissionIds: Array.isArray(source.dismissedPhotoProofMissionIds)
      ? source.dismissedPhotoProofMissionIds.filter((id): id is string => typeof id === "string")
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
