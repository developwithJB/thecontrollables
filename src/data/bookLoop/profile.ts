import type { ControllableType } from "@/components/ControllableCard";
import {
  DEFAULT_MY_CONTROLLABLES_PROFILE,
  EGO_PATTERNS,
  type EgoPatternId,
  type LocalParticipation,
  type LocalProofEntry,
  type MyControllablesProfile,
  type ProofVisibility,
} from "@/lib/myControllables";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";

export function normalizeProfile(value: unknown): MyControllablesProfile {
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
      ? profile.joinedChallengeIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    resetCompletedAt:
      typeof profile.resetCompletedAt === "string"
        ? profile.resetCompletedAt
        : null,
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
    handle:
      typeof participation.handle === "string" ? participation.handle : "",
    visibility: isProofVisibility(participation.visibility)
      ? participation.visibility
      : "private",
  };
}

function normalizeAssessment(
  value: unknown,
): MyControllablesProfile["assessment"] {
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
    avoidedPromise:
      typeof assessment.avoidedPromise === "string"
        ? assessment.avoidedPromise
        : "",
    releaseGrip:
      typeof assessment.releaseGrip === "string" ? assessment.releaseGrip : "",
    resetVision:
      typeof assessment.resetVision === "string" ? assessment.resetVision : "",
    completedAt:
      typeof assessment.completedAt === "string"
        ? assessment.completedAt
        : new Date().toISOString(),
    recommendedFirstPractice:
      typeof assessment.recommendedFirstPractice === "string"
        ? assessment.recommendedFirstPractice
        : "",
    recommendedQuest:
      typeof assessment.recommendedQuest === "string"
        ? assessment.recommendedQuest
        : "7-Day Reset",
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
  return (
    typeof value === "string" &&
    EGO_PATTERNS.some((pattern) => pattern.id === value)
  );
}

function isControllableType(value: unknown): value is ControllableType {
  return (
    typeof value === "string" &&
    ALL_CONTROLLABLES.includes(value as ControllableType)
  );
}
