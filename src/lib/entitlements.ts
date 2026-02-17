/**
 * Entitlement gating logic
 */

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

export const isPaidTier = (tier: PlanTier | null | undefined): boolean => {
  return !!tier && tier !== "free";
};

const normalizeTier = (tier: PlanTier | boolean | null | undefined): PlanTier => {
  if (tier === true) return "plus";
  if (tier === false || tier == null) return "free";
  return tier;
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
  return sessionCount >= 1;
};

export const canStartNewSnapshot = (tier: PlanTier | boolean, sessionCount: number): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return true;
  return sessionCount < 1;
};

export const canModifySnapshot = (tier: PlanTier | boolean, hasUsedTrial: boolean): boolean => {
  const resolvedTier = normalizeTier(tier);
  if (isPaidTier(resolvedTier)) return true;
  return !hasUsedTrial;
};
