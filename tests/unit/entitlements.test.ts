import { afterEach, describe, expect, it } from "vitest";
import {
  PAID_FEATURES,
  FREE_FEATURES,
  SNAPSHOT_DURATION_DAYS,
  canAccessFeature,
  canUseAIMemory,
  getAIPlanLimits,
  getAIUsageLimitStatus,
  canModifySnapshot,
  canStartNewSnapshot,
  getFreeTrialCompletionCopy,
  getFreeTrialOfferCopy,
  getFreeTrialSnapshotAllowance,
  getLockedFeatures,
  hasUsedFreeTrial,
  isFeatureLocked,
  isValidEntitlement,
} from "../../src/lib/entitlements";
import {
  setFeatureFlagProvider,
  type FeatureFlagKey,
  type FeatureFlagProvider,
} from "../../src/lib/featureFlags";

const buildProvider = (
  values: Partial<Record<FeatureFlagKey, unknown>>
): FeatureFlagProvider => ({
  getFlag: (key) => values[key],
});

afterEach(() => {
  setFeatureFlagProvider(null);
});

describe("entitlements", () => {
  it("preserves feature definitions", () => {
    expect(PAID_FEATURES.progressHistory).toBe("plus");
    expect(PAID_FEATURES.multipleResets).toBe("pro");
    expect(FREE_FEATURES.sevenDayReset).toBe(true);
  });

  it("locks paid features by tier rank", () => {
    expect(isFeatureLocked("progressHistory", "free")).toBe(true);
    expect(isFeatureLocked("progressHistory", "plus")).toBe(false);
    expect(isFeatureLocked("multipleResets", "plus")).toBe(true);
    expect(isFeatureLocked("multipleResets", "pro")).toBe(false);
  });

  it("returns locked features per tier", () => {
    const freeLocked = getLockedFeatures("free");
    const plusLocked = getLockedFeatures("plus");
    const proLocked = getLockedFeatures("pro");

    expect(freeLocked).toContain("aiCompanions");
    expect(plusLocked).toContain("multipleResets");
    expect(proLocked).toEqual([]);
  });

  it("checks feature access for free and paid features", () => {
    expect(canAccessFeature("sevenDayReset", "free")).toBe(true);
    expect(canAccessFeature("progressHistory", "free")).toBe(false);
    expect(canAccessFeature("progressHistory", "plus")).toBe(true);
  });

  it("validates entitlement payload shape", () => {
    expect(isValidEntitlement({ plan_tier: "plus", purchasedAt: "2026-02-17T00:00:00Z" })).toBe(true);
    expect(isValidEntitlement({ plan_tier: "premium", purchasedAt: "2026-02-17T00:00:00Z" })).toBe(true);
    expect(isValidEntitlement({ plan_tier: null, purchasedAt: null })).toBe(true);
    expect(isValidEntitlement({ isPaid: true, purchasedAt: null })).toBe(false);
  });

  it("defines AI-native limits by plan", () => {
    expect(getAIPlanLimits("free")).toMatchObject({
      dailyBriefsPerMonth: 5,
      adjustmentsPerMonth: 10,
      weeklyDeepReview: false,
      memoryItems: 0,
    });
    expect(getAIPlanLimits("pro")).toMatchObject({
      dailyBriefsPerMonth: null,
      weeklyDeepReview: true,
      deeperMoments: true,
    });
    expect(getAIPlanLimits("premium").adjustmentsPerMonth).toBeNull();
  });

  it("exhausts free AI usage safely", () => {
    expect(getAIUsageLimitStatus({ tier: "free", mode: "daily_brief", used: 4 })).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(getAIUsageLimitStatus({ tier: "free", mode: "daily_brief", used: 5 })).toMatchObject({
      allowed: false,
      upgradeRequired: true,
    });
    expect(getAIUsageLimitStatus({ tier: "free", mode: "adjust", used: 10 }).message).toContain("Upgrade");
  });

  it("gates weekly review and memory by AI plan limits", () => {
    expect(getAIUsageLimitStatus({ tier: "free", mode: "weekly_plan", used: 0 }).allowed).toBe(false);
    expect(getAIUsageLimitStatus({ tier: "pro", mode: "weekly_plan", used: 50 }).allowed).toBe(true);
    expect(canUseAIMemory("free", 0)).toBe(false);
    expect(canUseAIMemory("pro", 199)).toBe(true);
    expect(canUseAIMemory("pro", 200)).toBe(false);
  });

  it("applies trial rules from feature flags for free tier users", () => {
    setFeatureFlagProvider(
      buildProvider({
        trial_type: "snapshot_count",
        free_tier_snapshot_count: 3,
      })
    );

    expect(hasUsedFreeTrial("free", 2)).toBe(false);
    expect(hasUsedFreeTrial("free", 3)).toBe(true);
    expect(canStartNewSnapshot("free", 2)).toBe(true);
    expect(canStartNewSnapshot("free", 3)).toBe(false);
  });

  it("supports single-snapshot and unlimited trial modes", () => {
    setFeatureFlagProvider(buildProvider({ trial_type: "single_snapshot" }));
    expect(hasUsedFreeTrial("free", 1)).toBe(true);
    expect(canStartNewSnapshot("free", 1)).toBe(false);

    setFeatureFlagProvider(buildProvider({ trial_type: "unlimited" }));
    expect(hasUsedFreeTrial("free", 999)).toBe(false);
    expect(canStartNewSnapshot("free", 999)).toBe(true);
  });

  it("always allows paid tiers to start snapshots", () => {
    setFeatureFlagProvider(
      buildProvider({
        trial_type: "snapshot_count",
        free_tier_snapshot_count: 1,
      })
    );

    expect(hasUsedFreeTrial("plus", 999)).toBe(false);
    expect(canStartNewSnapshot("plus", 999)).toBe(true);
    expect(canStartNewSnapshot("pro", 999)).toBe(true);
  });

  it("derives free-trial copy from typed feature flags", () => {
    setFeatureFlagProvider(
      buildProvider({
        trial_type: "snapshot_count",
        free_tier_snapshot_count: 3,
      })
    );

    expect(getFreeTrialSnapshotAllowance()).toBe(3);
    expect(getFreeTrialOfferCopy()).toBe(`3 free ${SNAPSHOT_DURATION_DAYS}-Day Snapshots`);
    expect(getFreeTrialCompletionCopy()).toBe(`Your 3 free ${SNAPSHOT_DURATION_DAYS}-Day Snapshots are complete.`);

    setFeatureFlagProvider(buildProvider({ trial_type: "single_snapshot" }));
    expect(getFreeTrialSnapshotAllowance()).toBe(1);
    expect(getFreeTrialOfferCopy()).toBe(`1 free ${SNAPSHOT_DURATION_DAYS}-Day Snapshot`);

    setFeatureFlagProvider(buildProvider({ trial_type: "unlimited" }));
    expect(getFreeTrialSnapshotAllowance()).toBeNull();
    expect(getFreeTrialOfferCopy()).toBe(`Unlimited ${SNAPSHOT_DURATION_DAYS}-Day Snapshots`);
  });

  it("respects modify-snapshot rules", () => {
    expect(canModifySnapshot("free", true)).toBe(false);
    expect(canModifySnapshot("free", false)).toBe(true);
    expect(canModifySnapshot("plus", true)).toBe(true);
  });
});
