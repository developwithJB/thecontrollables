/**
 * Subscription Pricing Configuration
 *
 * Current Pro offer: $119.99/year or $14.99/month.
 * Plus remains a compatibility tier for existing subscribers.
 * Display amounts come from the shared server checkout contract.
 */

import { CHECKOUT_OFFERS } from "../../supabase/functions/_shared/billingContract";
export type { BillingInterval } from "../../supabase/functions/_shared/billingContract";
export type PlanTier = "plus" | "pro";
export type PlanType = PlanTier;

// Offer names only. Never embed a Stripe price ID in the browser bundle.
export const CHECKOUT_PLANS = ["plus", "pro"] as const;

export const PRICING = {
  plus: {
    annual: CHECKOUT_OFFERS.plus.year.amount / 100,
    monthlyEquivalent: 6.67,
  },
  pro: {
    annual: CHECKOUT_OFFERS.pro.year.amount / 100,
    monthly: CHECKOUT_OFFERS.pro.month.amount / 100,
    monthlyEquivalent: 10.00,
  },
} as const;

export const getPricing = () => ({
  plus: PRICING.plus,
  pro: PRICING.pro,
});

export const formatPrice = (tier: PlanTier): string => {
  return `$${PRICING[tier].annual}/yr`;
};

export const getPlanLabel = (tier: PlanTier): string => {
  return tier === "plus" ? "Plus" : "Pro";
};

// Displayed prices must match the shared checkout contract.
export const HOSTED_COACH_PRICE_DISPLAY: string = "$119.99/year or $14.99/month";
export const getHostedCoachPriceDisplay = (): string | null => HOSTED_COACH_PRICE_DISPLAY === "TBD" ? null : HOSTED_COACH_PRICE_DISPLAY;
