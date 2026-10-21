import { describe, it, expect } from "vitest";
import {
  subscriptionPeriod,
  subscriptionTier,
  entitlementIsCurrent,
  isLegacyAppGrant,
} from "../../supabase/functions/_shared/stripeSubscription";
describe("paid entitlement synchronization", () => {
  it.each(["stripe", "promo", "webhook"])("separates untiered historical %s grants from subscriptions",source=>{
    expect(isLegacyAppGrant({source,plan_tier:null,subscription_status:null})).toBe(true);
    expect(isLegacyAppGrant({source,plan_tier:"pro",subscription_status:"active"})).toBe(false);
    expect(isLegacyAppGrant({source,expires_at:"2000-01-01"})).toBe(false);
  });
  it("does not reclassify manual or verified subscription access as an untiered historical grant",()=>{
    expect(isLegacyAppGrant(null)).toBe(false);
    expect(isLegacyAppGrant({source:"manual"})).toBe(false);
    expect(isLegacyAppGrant({source:"stripe_subscription",plan_tier:"pro",subscription_status:"active"})).toBe(false);
  });
  it("reads Basil item periods and supports older webhook versions", () => {
    expect(
      subscriptionPeriod({
        items: {
          data: [{ current_period_start: 100, current_period_end: 200 }],
        },
      }),
    ).toEqual({ start: 100, end: 200 });
    expect(
      subscriptionPeriod({
        items: { data: [{}] },
        current_period_start: 100,
        current_period_end: 200,
      }),
    ).toEqual({ start: 100, end: 200 });
  });
  it("rejects missing or ambiguous periods", () => {
    expect(() => subscriptionPeriod({ items: { data: [{}] } })).toThrow();
    expect(() => subscriptionPeriod({ items: { data: [{}, {}] } })).toThrow();
  });
  it("never grants Pro for an unknown price or a supplied metadata tier", () => {
    expect(() => subscriptionTier("unknown", {})).toThrow();
    expect(subscriptionTier("legacy", { legacy: "pro" })).toBe("pro");
  });
  it.each(["past_due", "unpaid", "incomplete", "incomplete_expired", "paused", "canceled"])(
    "rejects nonpaying state %s",
    (status) => {
      expect(
        entitlementIsCurrent({
          source: "stripe_subscription",
          subscription_status: status,
          expires_at: "2099-01-01",
        }),
      ).toBe(false);
    },
  );
  it("keeps scheduled cancellation active until expiry and preserves manual grants", () => {
    expect(
      entitlementIsCurrent({
        source: "stripe_subscription",
        subscription_status: "active",
        expires_at: "2099-01-01",
      }),
    ).toBe(true);
    expect(
      entitlementIsCurrent({
        source: "stripe_subscription",
        subscription_status: "active",
        expires_at: "2000-01-01",
      }),
    ).toBe(false);
    expect(entitlementIsCurrent({ source: "manual" })).toBe(true);
  });
});
