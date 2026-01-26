/**
 * Entitlement gating logic
 * 
 * This module defines what features are available to free vs paid users.
 * Extracted for easy unit testing.
 */

/**
 * Features that require payment
 */
export const PAID_FEATURES = {
  progressHistory: true,
  resetHistory: true,
  badgesEarned: true,
  momentumDecay: true,
  aiCompanions: true,
  certificateDownload: true,
  multipleResets: true,
} as const;

export type PaidFeature = keyof typeof PAID_FEATURES;

/**
 * Features available to all users (free tier)
 */
export const FREE_FEATURES = {
  sevenDayReset: true,
  buildAssessment: true,
  xpTracking: true,
  timeCurrency: true,
  integrityMeter: true,
} as const;

export type FreeFeature = keyof typeof FREE_FEATURES;

/**
 * Check if a feature requires payment
 */
export const isFeatureLocked = (feature: PaidFeature, isPaid: boolean): boolean => {
  if (isPaid) return false;
  return PAID_FEATURES[feature] === true;
};

/**
 * Check if user can access a specific feature
 */
export const canAccessFeature = (feature: PaidFeature | FreeFeature, isPaid: boolean): boolean => {
  // Free features are always accessible
  if (feature in FREE_FEATURES) return true;
  
  // Paid features require payment
  if (feature in PAID_FEATURES) return isPaid;
  
  return false;
};

/**
 * Get list of locked features for a free user
 */
export const getLockedFeatures = (isPaid: boolean): PaidFeature[] => {
  if (isPaid) return [];
  return Object.keys(PAID_FEATURES) as PaidFeature[];
};

/**
 * Validate that entitlement data has expected shape
 */
export const isValidEntitlement = (entitlement: unknown): entitlement is { 
  isPaid: boolean; 
  purchasedAt: string | null 
} => {
  if (typeof entitlement !== 'object' || entitlement === null) return false;
  const ent = entitlement as Record<string, unknown>;
  return typeof ent.isPaid === 'boolean' && 
         (ent.purchasedAt === null || typeof ent.purchasedAt === 'string');
};
