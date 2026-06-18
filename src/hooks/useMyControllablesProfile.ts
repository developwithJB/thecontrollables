import { useCallback, useEffect, useMemo, useState } from "react";
import type { ControllableType } from "@/components/ControllableCard";
import {
  createProofEntry,
  createStartingReadResult,
  DEFAULT_MY_CONTROLLABLES_PROFILE,
  EGO_PATTERNS,
  getDailyTrainingPlan,
  getLocalBoards,
  getLocalChallenges,
  getProofCards,
  getSelfTrustStats,
  type EgoPatternId,
  type LocalParticipation,
  type LocalProofEntry,
  type MyControllablesProfile,
  type ProofEntryKind,
  type ProofVisibility,
  type StartingReadAnswers,
} from "@/lib/myControllables";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";

const STORAGE_PREFIX = "my_controllables_profile";

export function useMyControllablesProfile(userId: string | null | undefined) {
  const storageKey = useMemo(() => `${STORAGE_PREFIX}_${userId || "guest"}`, [userId]);
  const [profile, setProfile] = useState<MyControllablesProfile>(() => readProfile(storageKey));

  useEffect(() => {
    setProfile(readProfile(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: MyControllablesProfile) => MyControllablesProfile) => {
      setProfile((current) => {
        const next = updater(current);
        writeProfile(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const saveStartingRead = useCallback(
    (answers: StartingReadAnswers) => {
      const result = createStartingReadResult(answers);
      persist((current) => ({
        ...current,
        startedAt: current.startedAt ?? result.completedAt,
        assessment: result,
      }));
    },
    [persist],
  );

  const updateParticipation = useCallback(
    (participation: Partial<LocalParticipation>) => {
      persist((current) => ({
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
    (input: { controllable: ControllableType; promise: string; kind: ProofEntryKind }) => {
      const entry = createProofEntry(input);
      persist((current) => {
        const entriesForOtherDays = current.proofEntries.filter((item) => item.date !== entry.date);
        return {
          ...current,
          proofEntries: [entry, ...entriesForOtherDays].slice(0, 120),
        };
      });
      return entry;
    },
    [persist],
  );

  const joinChallenge = useCallback(
    (challengeId: string) => {
      persist((current) => ({
        ...current,
        joinedChallengeIds: current.joinedChallengeIds.includes(challengeId)
          ? current.joinedChallengeIds
          : [...current.joinedChallengeIds, challengeId],
      }));
    },
    [persist],
  );

  const markResetComplete = useCallback(() => {
    persist((current) => ({
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

function readProfile(storageKey: string): MyControllablesProfile {
  if (typeof window === "undefined") return DEFAULT_MY_CONTROLLABLES_PROFILE;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return cloneDefaultProfile();

    return normalizeProfile(JSON.parse(raw));
  } catch {
    return cloneDefaultProfile();
  }
}

function writeProfile(storageKey: string, profile: MyControllablesProfile) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(profile));
  } catch {
    // Local storage can fail in private browsing or restricted contexts.
  }
}

function normalizeProfile(value: unknown): MyControllablesProfile {
  if (!value || typeof value !== "object") return cloneDefaultProfile();

  const profile = value as Partial<MyControllablesProfile>;
  const participation = normalizeParticipation(profile.participation);
  const assessment = normalizeAssessment(profile.assessment);

  return {
    startedAt: typeof profile.startedAt === "string" ? profile.startedAt : null,
    assessment,
    participation,
    proofEntries: normalizeProofEntries(profile.proofEntries),
    joinedChallengeIds: Array.isArray(profile.joinedChallengeIds)
      ? profile.joinedChallengeIds.filter((id): id is string => typeof id === "string")
      : [],
    resetCompletedAt: typeof profile.resetCompletedAt === "string" ? profile.resetCompletedAt : null,
  };
}

function cloneDefaultProfile(): MyControllablesProfile {
  return {
    ...DEFAULT_MY_CONTROLLABLES_PROFILE,
    participation: { ...DEFAULT_MY_CONTROLLABLES_PROFILE.participation },
    proofEntries: [],
    joinedChallengeIds: [],
  };
}

function normalizeParticipation(value: unknown): LocalParticipation {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_MY_CONTROLLABLES_PROFILE.participation };
  }

  const participation = value as Partial<LocalParticipation>;
  return {
    city: typeof participation.city === "string" ? participation.city : "",
    state: typeof participation.state === "string" ? participation.state : "",
    handle: typeof participation.handle === "string" ? participation.handle : "",
    visibility: isProofVisibility(participation.visibility) ? participation.visibility : "private",
  };
}

function normalizeAssessment(value: unknown): MyControllablesProfile["assessment"] {
  if (!value || typeof value !== "object") return null;

  const assessment = value as Partial<MyControllablesProfile["assessment"]>;
  if (
    !isControllableType(assessment.strongest) ||
    !isControllableType(assessment.growth) ||
    !isEgoPatternId(assessment.egoPattern)
  ) {
    return null;
  }

  return {
    strongest: assessment.strongest,
    growth: assessment.growth,
    egoPattern: assessment.egoPattern,
    avoidedPromise: typeof assessment.avoidedPromise === "string" ? assessment.avoidedPromise : "",
    releaseGrip: typeof assessment.releaseGrip === "string" ? assessment.releaseGrip : "",
    resetVision: typeof assessment.resetVision === "string" ? assessment.resetVision : "",
    completedAt: typeof assessment.completedAt === "string" ? assessment.completedAt : new Date().toISOString(),
    recommendedFirstPractice:
      typeof assessment.recommendedFirstPractice === "string" ? assessment.recommendedFirstPractice : "",
    recommendedQuest: typeof assessment.recommendedQuest === "string" ? assessment.recommendedQuest : "7-Day Reset",
    shareText:
      typeof assessment.shareText === "string"
        ? assessment.shareText
        : "I started tracking My Controllables in The Dashboard.",
  };
}

function normalizeProofEntries(value: unknown): LocalProofEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is LocalProofEntry => {
    if (!entry || typeof entry !== "object") return false;

    const item = entry as Partial<LocalProofEntry>;
    return (
      typeof item.id === "string" &&
      typeof item.date === "string" &&
      typeof item.createdAt === "string" &&
      isControllableType(item.controllable) &&
      typeof item.promise === "string" &&
      (item.kind === "kept_promise" || item.kind === "recovery_win") &&
      typeof item.xp === "number"
    );
  });
}

function isProofVisibility(value: unknown): value is ProofVisibility {
  return value === "private" || value === "anonymous" || value === "public";
}

function isEgoPatternId(value: unknown): value is EgoPatternId {
  return typeof value === "string" && EGO_PATTERNS.some((pattern) => pattern.id === value);
}

function isControllableType(value: unknown): value is ControllableType {
  return typeof value === "string" && ALL_CONTROLLABLES.includes(value as ControllableType);
}
