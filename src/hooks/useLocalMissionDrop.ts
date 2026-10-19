import { useBookLoopState } from "@/hooks/useBookLoopState";
import { useCallback, useMemo } from "react";
import {
  completeLocalMission,
  generateLocalMission,
  getLocalMissionProofCopy,
  normalizeLocalMissionPreferences,
  type LocalMission,
  type LocalMissionCompletionResult,
  type LocalMissionPreferences,
} from "@/lib/localMissionDrop";

export function useLocalMissionDrop(userId: string | null | undefined) {
  const { state, persist } = useBookLoopState("missions", userId);

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
      return persist((current) => ({
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
      return updatePreferences({
        ...preferences,
        localMissionsEnabled: true,
        showCityOnShareCards: false,
      });
    },
    [updatePreferences],
  );

  const startMission = useCallback(
    (missionId: string) => {
      return persist((current) => ({
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
      return persist((current) => ({
        ...current,
        dismissedPhotoProofMissionIds: current.dismissedPhotoProofMissionIds.includes(missionId)
          ? current.dismissedPhotoProofMissionIds
          : [...current.dismissedPhotoProofMissionIds, missionId],
      }));
    },
    [persist],
  );

  const completeMission = useCallback(
    async (targetMission: LocalMission): Promise<LocalMissionCompletionResult | null> => {
      const completedAt = state.completedAtByMissionId[targetMission.id] ?? null;
      const result = completeLocalMission({
        ...targetMission,
        completed: Boolean(completedAt),
        completedAt,
      });

      if (!result.alreadyCompleted && result.mission.completedAt) {
        const saved = await persist((current) => ({
          ...current,
          startedMissionIds: current.startedMissionIds.includes(targetMission.id)
            ? current.startedMissionIds
            : [...current.startedMissionIds, targetMission.id],
          completedAtByMissionId: {
            ...current.completedAtByMissionId,
            [targetMission.id]: result.mission.completedAt!,
          },
        }));
        if (!saved) return null;
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
