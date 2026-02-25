/**
 * Entitlement gating logic
 */
import { getFeatureFlags } from "@/lib/featureFlags";

export type PlanTier = "free" | "plus" | "pro" | "lifetime";

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  lifetime: 2,
};

export const PAID_FEATURES = {
  progressHistory: "plus",
  resetHistory: "plus",
  badgesEarned: "plus",
  momentumDecay: "plus",
  aiCompanions: "plus",
  certificateDownload: "plus",
  multipleResets: "pro",
} as const;

export type PaidFeature = keyof typeof PAID_FEATURES;

export const FREE_FEATURES = {
  sevenDayReset: true,
  buildAssessment: true,
  xpTracking: true,
  timeCurrency: true,
  integrityMeter: true,
} as const;

export type FreeFeature = keyof typeof FREE_FEATURES;

export const SNAPSHOT_DURATION_DAYS = 7;

export const isPaidTier = (tier: PlanTier | null | undefined): boolean => {
  return !!tier && tier !== "free";
};

const normalizeTier = (tier: PlanTier | boolean | null | undefined): PlanTier => {
  if (tier === true) return "plus";
  if (tier === false || tier == null) return "free";
  return tier;
};

const getSafeSessionCount = (sessionCount: number): number => {
  return Number.isFinite(sessionCount) ? Math.max(0, Math.floor(sessionCount)) : 0;
};

export const getFreeTrialSnapshotAllowance = (): number | null => {
  const { trial_type: trialType, free_tier_snapshot_count: freeTierSnapshotCount } = getFeatureFlags();
  const snapshotLimit = Math.max(1, freeTierSnapshotCount);

  if (trialType === "unlimited") return null;
  if (trialType === "single_snapshot") return 1;
  return snapshotLimit;
};

export const getFreeTrialOfferCopy = (): string => {
  const allowance = getFreeTrialSnapshotAllowance();
  const snapshotLabel = `${SNAPSHOT_DURATION_DAYS}-Day Snapshot`;
  if (allowance === null) {
    return `Unlimited ${snapshotLabel}s`;
  }
  return allowance === 1 ? `1 free ${snapshotLabel}` : `${allowance} free ${snapshotLabel}s`;
};

export const getFreeTrialCompletionCopy = (): string => {
  const allowance = getFreeTrialSnapshotAllowance();
  const snapshotLabel = `${SNAPSHOT_DURATION_DAYS}-Day Snapshot`;
  if (allowance === null) {
    return `You can keep starting ${snapshotLabel}s.`;
  }
  if (allowance === 1) {
    return `Your free ${snapshotLabel} is complete.`;
  }
  return `Your ${allowance} free ${snapshotLabel}s are complete.`;
};

export const isFeatureLocked = (feature: PaidFeature, tier: PlanTier | boolean): boolean => {
  const resolvedTier = normalizeTier(tier);
  return TIER_RANK[resolvedTier] < TIER_RANK[PAID_FEATURES[feature]];
};

export const canAccessFeature = (feature: PaidFeature | FreeFeature, tier: PlanTier | boolean): boolean => {
  if (feature in FREE_FEATURES) return true;
  if (feature in PAID_FEATURES) return !isFeatureLocked(feature as PaidFeature, tier);
  return false;
};

export const getLockedFeatures = (tier: PlanTier | boolean): PaidFeature[] => {
  const resolvedTier = normalizeTier(tier);
  if (resolvedTier === "lifetime") return [];
  return (Object.keys(PAID_FEATURES) as PaidFeature[]).filter((feature) => isFeatureLocked(feature, resolvedTier));
};

export const isValidEntitlement = (entitlement: unknown): entitlement is {
  plan_tier: PlanTier | null;
  purchasedAt: string | null;
} => {
  if (typeof entitlement !== "object" || entitlement === null) return false;
  const ent = entitlement as Record<string, unknown>;
  const tier = ent.plan_tier;
  const tierValid = tier === null || tier === "free" || tier === "plus" || tier === "pro" || tier === "lifetime";
  return tierValid && (ent.purchasedAt === null || typeof ent.purchasedAt === "string");
};

export const hasUsedFreeTrial = (tier: PlanTier | boolean, sessionCount: number): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return false;

  const safeSessionCount = getSafeSessionCount(sessionCount);
  const allowance = getFreeTrialSnapshotAllowance();
  if (allowance === null) return false;
  return safeSessionCount >= allowance;
};

export const canStartNewSnapshot = (tier: PlanTier | boolean, sessionCount: number): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return true;

  const safeSessionCount = getSafeSessionCount(sessionCount);
  const allowance = getFreeTrialSnapshotAllowance();
  if (allowance === null) return true;
  return safeSessionCount < allowance;
};

export const canModifySnapshot = (tier: PlanTier | boolean, hasUsedTrial: boolean): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return true;
  return !hasUsedTrial;
};

/**
 * Check if user is currently in an active free trial.
 * True when: free tier, has an active (not completed/expired) session, and within snapshot allowance.
 */
export const isInActiveTrial = (
  tier: PlanTier | boolean,
  hasActiveSession: boolean,
  isSessionCompleted: boolean,
  isSessionExpired: boolean,
  sessionCount: number,
): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return false;
  if (!hasActiveSession) return false;
  if (isSessionCompleted || isSessionExpired) return false;
  const allowance = getFreeTrialSnapshotAllowance();
  if (allowance === null) return true;
  return sessionCount <= allowance;
};

/** Daily AI message limits by user state */
export const AI_DAILY_LIMITS = {
  trial: 5,      // Free users during active trial
  paid: 25,      // Paid subscribers
  postTrial: 0,  // Free users after trial ends
} as const;
