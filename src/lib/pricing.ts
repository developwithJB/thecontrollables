/**
 * Subscription Pricing Configuration
 *
 * Two annual-first tiers:
 * - Plus ($79.99/yr)
 * - Pro ($119.99/yr)
 */

export type PlanTier = "plus" | "pro";
export type PlanType = PlanTier;

// Stripe Price IDs (Production)
export const PRICE_IDS: Record<PlanTier, string> = {
  plus: "price_1Sty3RIrFORWV7K4lF4DZhPV",
  pro: "price_1Sty37IrFORWV7K43PkIVSJx",
} as const;

export const PRICING = {
  plus: {
    annual: 79.99,
    monthlyEquivalent: 6.67,
  },
  pro: {
    annual: 119.99,
    monthlyEquivalent: 9.99,
  },
} as const;

export const getPricing = () => ({
  plus: PRICING.plus,
  pro: PRICING.pro,
});

export const getPriceId = (tier: PlanTier): string => {
  return PRICE_IDS[tier];
};

export const formatPrice = (tier: PlanTier): string => {
  return `$${PRICING[tier].annual}/yr`;
};

export const getPlanLabel = (tier: PlanTier): string => {
  return tier === "plus" ? "Plus" : "Pro";
};
