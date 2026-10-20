/** Shared public offer contract. Stripe IDs and authorization remain server-owned. */
export type CheckoutTier = "plus" | "pro";
export type BillingInterval = "year" | "month";
export const CHECKOUT_OFFERS = {
  plus: {
    year: { amount: 7999, currency: "usd", env: "STRIPE_PRICE_ID_PLUS" },
  },
  pro: {
    year: { amount: 11999, currency: "usd", env: "STRIPE_PRICE_ID_PRO_ANNUAL" },
    month: {
      amount: 1499,
      currency: "usd",
      env: "STRIPE_PRICE_ID_PRO_MONTHLY",
    },
  },
} as const;
export function checkoutOffer(tier: CheckoutTier, interval: BillingInterval) {
  if (tier === "plus")
    return interval === "year" ? CHECKOUT_OFFERS.plus.year : null;
  return CHECKOUT_OFFERS.pro[interval];
}
export function matchesCheckoutPrice(
  price: {
    active: boolean;
    currency: string;
    unit_amount: number | null;
    type: string;
    recurring?: {
      interval: string;
      interval_count: number;
      usage_type?: string;
    } | null;
    billing_scheme?: string;
    custom_unit_amount?: unknown;
    transform_quantity?: unknown;
  },
  tier: CheckoutTier,
  interval: BillingInterval,
): boolean {
  const offer = checkoutOffer(tier, interval);
  return (
    !!offer &&
    price.active &&
    price.type === "recurring" &&
    price.currency === offer.currency &&
    price.unit_amount === offer.amount &&
    price.recurring?.interval === interval &&
    price.recurring.interval_count === 1 &&
    price.recurring.usage_type !== "metered" &&
    (!price.billing_scheme || price.billing_scheme === "per_unit") &&
    !price.custom_unit_amount &&
    !price.transform_quantity
  );
}
export const HOSTED_AI_ALLOWANCE = {
  freeRepliesLifetime: 5,
  freeBudgetMicros: 100_000,
  paidRepliesMonthly: 200,
  paidRepliesDaily: 10,
  paidBudgetMicros: 2_500_000,
  byoRequestsDaily: 100,
} as const;
