import { type PlanType } from "@/lib/pricing";

export const FEATURE_FLAG_KEYS = {
  onboardingQuickStartEnabled: "onboarding_quick_start_enabled",
  freeTierSnapshotCount: "free_tier_snapshot_count",
  trialType: "trial_type",
  paywallPlacement: "paywall_placement",
  pricingTierModel: "pricing_tier_model",
} as const;

export type TrialType = "single_snapshot" | "multi_snapshot";
export type PaywallPlacement = "inline" | "overlay";
export type PricingTierModel = "monthly_yearly" | "yearly_monthly";

export type FeatureFlagValues = {
  onboarding_quick_start_enabled: boolean;
  free_tier_snapshot_count: number;
  trial_type: TrialType;
  paywall_placement: PaywallPlacement;
  pricing_tier_model: PricingTierModel;
};

const DEFAULT_FEATURE_FLAGS: FeatureFlagValues = {
  onboarding_quick_start_enabled: true,
  free_tier_snapshot_count: 1,
  trial_type: "single_snapshot",
  paywall_placement: "overlay",
  pricing_tier_model: "monthly_yearly",
};

interface FeatureFlagProvider {
  getFlag: (key: keyof FeatureFlagValues) => unknown;
}

const isBrowser = () => typeof window !== "undefined";

const getOverrideFlags = (): Partial<FeatureFlagValues> => {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem("feature_flag_overrides");
    if (!raw) return {};
    return JSON.parse(raw) as Partial<FeatureFlagValues>;
  } catch {
    return {};
  }
};

const postHogProvider: FeatureFlagProvider | null = isBrowser() && (window as any).posthog
  ? {
      getFlag: (key) => {
        const posthog = (window as any).posthog;
        if (key === "onboarding_quick_start_enabled") {
          return posthog.isFeatureEnabled?.(key);
        }
        return posthog.getFeatureFlag?.(key);
      },
    }
  : null;

const launchDarklyProvider: FeatureFlagProvider | null = isBrowser() && (window as any).ldClient
  ? {
      getFlag: (key) => (window as any).ldClient.variation?.(key, undefined),
    }
  : null;

const provider: FeatureFlagProvider | null = postHogProvider ?? launchDarklyProvider;

function coerceFlagValue<K extends keyof FeatureFlagValues>(key: K, value: unknown): FeatureFlagValues[K] {
  const fallback = DEFAULT_FEATURE_FLAGS[key];

  if (typeof fallback === "boolean") {
    return (typeof value === "boolean" ? value : fallback) as FeatureFlagValues[K];
  }

  if (typeof fallback === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value)) as FeatureFlagValues[K];
    }
    return fallback as FeatureFlagValues[K];
  }

  if (typeof value === "string") {
    if (key === "trial_type" && (value === "single_snapshot" || value === "multi_snapshot")) {
      return value as FeatureFlagValues[K];
    }

    if (key === "paywall_placement" && (value === "inline" || value === "overlay")) {
      return value as FeatureFlagValues[K];
    }

    if (key === "pricing_tier_model" && (value === "monthly_yearly" || value === "yearly_monthly")) {
      return value as FeatureFlagValues[K];
    }
  }

  return fallback as FeatureFlagValues[K];
}

export function getFeatureFlag<K extends keyof FeatureFlagValues>(key: K): FeatureFlagValues[K] {
  const overrides = getOverrideFlags();
  if (overrides[key] !== undefined) {
    return coerceFlagValue(key, overrides[key]);
  }

  const providerValue = provider?.getFlag(key);
  return coerceFlagValue(key, providerValue);
}

export function getFeatureFlags(): FeatureFlagValues {
  return {
    onboarding_quick_start_enabled: getFeatureFlag("onboarding_quick_start_enabled"),
    free_tier_snapshot_count: getFeatureFlag("free_tier_snapshot_count"),
    trial_type: getFeatureFlag("trial_type"),
    paywall_placement: getFeatureFlag("paywall_placement"),
    pricing_tier_model: getFeatureFlag("pricing_tier_model"),
  };
}

export function getDefaultCheckoutPlan(): PlanType {
  const model = getFeatureFlag("pricing_tier_model");
  return model === "yearly_monthly" ? "yearly" : "monthly";
}

export function shouldUseInlinePaywall(): boolean {
  return getFeatureFlag("paywall_placement") === "inline";
}

export function getFreeTierSnapshotCount(): number {
  return Math.max(0, getFeatureFlag("free_tier_snapshot_count"));
}
