/**
 * Subscription Pricing Configuration
 * 
 * Two tiers: Monthly ($9.99/mo) and Yearly ($79.99/yr - saves 33%)
 */

// Stripe Price IDs (Production)
export const PRICE_IDS = {
  monthly: "price_1Sty37IrFORWV7K43PkIVSJx", // $9.99/month
  yearly: "price_1Sty3RIrFORWV7K4lF4DZhPV",  // $79.99/year
} as const;

export type PlanType = "monthly" | "yearly";

/**
 * Pricing amounts and savings
 */
export const PRICING = {
  monthly: 9.99,
  yearly: 79.99,
  yearlyMonthlyEquivalent: 6.67, // $79.99/12 = ~$6.67/month
  yearlySavingsPercent: 33,
  yearlySavingsAmount: 40, // $9.99 * 12 = $119.88 - $79.99 = ~$40
} as const;

/**
 * Get pricing information
 */
export const getPricing = () => ({
  monthly: PRICING.monthly,
  yearly: PRICING.yearly,
  yearlyMonthlyEquivalent: PRICING.yearlyMonthlyEquivalent,
  yearlySavingsPercent: PRICING.yearlySavingsPercent,
  yearlySavingsAmount: PRICING.yearlySavingsAmount,
});

/**
 * Get the price ID for a given plan
 */
export const getPriceId = (plan: PlanType): string => {
  return PRICE_IDS[plan];
};

/**
 * Format price for display
 */
export const formatPrice = (plan: PlanType): string => {
  if (plan === "monthly") {
    return `$${PRICING.monthly}/mo`;
  }
  return `$${PRICING.yearly}/yr`;
};

/**
 * Get the display label for a plan
 */
export const getPlanLabel = (plan: PlanType): string => {
  return plan === "monthly" ? "Monthly" : "Yearly";
};
