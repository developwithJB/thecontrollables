import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  getDefaultCheckoutPlan,
  getFeatureFlags,
  setFeatureFlagProvider,
  shouldUseInlinePaywall,
  type FeatureFlagKey,
  type FeatureFlagProvider,
} from "../../src/lib/featureFlags";
import { PRICE_IDS } from "../../src/lib/pricing";

const buildProvider = (
  values: Partial<Record<FeatureFlagKey, unknown>>
): FeatureFlagProvider => ({
  getFlag: (key) => values[key],
});

describe("featureFlags", () => {
  afterEach(() => {
    setFeatureFlagProvider(null);
  });

  it("returns deterministic defaults when no provider is available", () => {
    expect(getFeatureFlags()).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("normalizes provider values into typed flags", () => {
    setFeatureFlagProvider(
      buildProvider({
        onboarding_quick_start_enabled: "false",
        free_tier_snapshot_count: "3",
        trial_type: "single",
        paywall_placement: "promo",
        pricing_tier_model: "monthly",
      })
    );

    expect(getFeatureFlags()).toEqual({
      onboarding_quick_start_enabled: false,
      formation_circuits_enabled: true,
      formation_completion_enabled: true,
      formation_content_admin_enabled: true,
      formation_analytics_enabled: true,
      free_tier_snapshot_count: 3,
      trial_type: "single_snapshot",
      paywall_placement: "promo",
      pricing_tier_model: "monthly_default",
    });
  });

  it("supports explicit per-call overrides", () => {
    expect(
      getFeatureFlags({
        free_tier_snapshot_count: 4,
        paywall_placement: "inline",
      })
    ).toMatchObject({
      free_tier_snapshot_count: 4,
      paywall_placement: "inline",
    });
  });

  it("maps pricing model to checkout plan helper", () => {
    const availablePlans = Object.keys(PRICE_IDS);

    expect(availablePlans).toContain(getDefaultCheckoutPlan({ pricing_tier_model: "monthly_default" }));
    expect(availablePlans).toContain(getDefaultCheckoutPlan({ pricing_tier_model: "yearly_default" }));

    if (availablePlans.includes("plus") && availablePlans.includes("pro")) {
      expect(getDefaultCheckoutPlan({ pricing_tier_model: "yearly_default" })).toBe("plus");
      expect(getDefaultCheckoutPlan({ pricing_tier_model: "monthly_default" })).toBe("pro");
    }
  });

  it("maps paywall placement to inline helper", () => {
    expect(shouldUseInlinePaywall({ paywall_placement: "overlay" })).toBe(false);
    expect(shouldUseInlinePaywall({ paywall_placement: "inline" })).toBe(true);
    expect(shouldUseInlinePaywall({ paywall_placement: "promo" })).toBe(true);
  });
});
