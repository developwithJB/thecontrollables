// Audited legacy offers are entitlement mappings only, never new checkout offers.
export const LEGACY_SUBSCRIPTION_PRICES = {
  price_1Sty3RIrFORWV7K4lF4DZhPV: "plus",
  price_1Sty37IrFORWV7K43PkIVSJx: "pro",
} as const;
/** Basil moved billing periods onto subscription items. Accept old webhook shapes
 * during Stripe API-version rollout, but fail closed on ambiguous/missing data. */
export function subscriptionPeriod(subscription: {
  current_period_start?: number;
  current_period_end?: number;
  items: {
    data: Array<{ current_period_start?: number; current_period_end?: number }>;
  };
}) {
  if (subscription.items.data.length !== 1)
    throw new Error("unsupported_subscription_items");
  const item = subscription.items.data[0];
  const start = item.current_period_start ?? subscription.current_period_start;
  const end = item.current_period_end ?? subscription.current_period_end;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !start ||
    !end ||
    end <= start
  )
    throw new Error("invalid_subscription_period");
  return { start, end };
}
export function subscriptionTier(
  priceId: string | undefined,
  map: Record<string, "plus" | "pro" | "premium">,
) {
  const tier = priceId ? map[priceId] : undefined;
  if (!tier) throw new Error("unrecognized_subscription_price");
  return tier;
}
export function entitlementIsCurrent(
  entitlement: {
    expires_at?: string | null;
    source?: string;
    subscription_status?: string | null;
  },
  now = Date.now(),
) {
  const unexpired =
    !entitlement.expires_at || new Date(entitlement.expires_at).getTime() > now;
  const status = entitlement.subscription_status;
  return (
    unexpired &&
    (entitlement.source === "manual" ||
      status === "active" ||
      status === "trialing" ||
      status === "canceled" ||
      (!status &&
        ["stripe", "promo", "webhook"].includes(entitlement.source ?? "")))
  );
}
