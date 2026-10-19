import { useBookLoopState } from "@/hooks/useBookLoopState";
import { useCallback, useMemo } from "react";
import type { ControllableType } from "@/components/ControllableCard";
import {
  createProofEntry,
  createStartingReadResult,
  getDailyTrainingPlan,
  getLocalBoards,
  getLocalChallenges,
  getProofCards,
  getSelfTrustStats,
  type LocalParticipation,
  type ProofEntryKind,
  type StartingReadAnswers,
} from "@/lib/myControllables";

export function useMyControllablesProfile(userId: string | null | undefined) {
  const { state: profile, persist, server } = useBookLoopState("profile", userId);

  const saveStartingRead = useCallback(
    (answers: StartingReadAnswers) => {
      const result = createStartingReadResult(answers);
      return persist((current) => ({
        ...current,
        startedAt: current.startedAt ?? result.completedAt,
        assessment: result,
      }));
    },
    [persist],
  );

  const updateParticipation = useCallback(
    (participation: Partial<LocalParticipation>) => {
      return persist((current) => ({
        ...current,
        participation: {
          ...current.participation,
          ...participation,
        },
      }));
    },
    [persist],
  );

  const logDailyTraining = useCallback(
    async (input: { controllable: ControllableType; promise: string; kind: ProofEntryKind }) => {
      const entry = createProofEntry(input);
      const saved = await persist((current) => {
        const entriesForOtherDays = current.proofEntries.filter((item) => item.date !== entry.date);
        return {
          ...current,
          proofEntries: [entry, ...entriesForOtherDays].slice(0, server ? undefined : 120),
        };
      });
      return saved ? entry : null;
    },
    [persist, server],
  );

  const joinChallenge = useCallback(
    (challengeId: string) => {
      return persist((current) => ({
        ...current,
        joinedChallengeIds: current.joinedChallengeIds.includes(challengeId)
          ? current.joinedChallengeIds
          : [...current.joinedChallengeIds, challengeId],
      }));
    },
    [persist],
  );

  const markResetComplete = useCallback(() => {
    return persist((current) => ({
      ...current,
      resetCompletedAt: current.resetCompletedAt ?? new Date().toISOString(),
    }));
  }, [persist]);

  const stats = useMemo(() => getSelfTrustStats(profile), [profile]);
  const dailyPlan = useMemo(() => getDailyTrainingPlan(profile), [profile]);
  const proofCards = useMemo(() => getProofCards(profile), [profile]);
  const localBoards = useMemo(() => getLocalBoards(profile), [profile]);
  const localChallenges = useMemo(() => getLocalChallenges(profile), [profile]);

  return {
    profile,
    stats,
    dailyPlan,
    proofCards,
    localBoards,
    localChallenges,
    saveStartingRead,
    updateParticipation,
    logDailyTraining,
    joinChallenge,
    markResetComplete,
  };
}
