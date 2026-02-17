import { PRICE_IDS, type PlanType } from "@/lib/pricing";

export const FEATURE_FLAG_KEYS = [
  "onboarding_quick_start_enabled",
  "free_tier_snapshot_count",
  "trial_type",
  "paywall_placement",
  "pricing_tier_model",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type TrialType = "snapshot_count" | "single_snapshot" | "unlimited";
export type PaywallPlacement = "overlay" | "inline" | "promo";
export type PricingTierModel = "yearly_default" | "monthly_default";

export interface FeatureFlags {
  onboarding_quick_start_enabled: boolean;
  free_tier_snapshot_count: number;
  trial_type: TrialType;
  paywall_placement: PaywallPlacement;
  pricing_tier_model: PricingTierModel;
}

export type FeatureFlagOverrides = Partial<Record<FeatureFlagKey, unknown>>;

export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  onboarding_quick_start_enabled: true,
  free_tier_snapshot_count: 1,
  trial_type: "snapshot_count",
  paywall_placement: "overlay",
  pricing_tier_model: "yearly_default",
});

const LOCAL_OVERRIDE_STORAGE_KEY = "feature_flag_overrides";

type RawFeatureFlagValue = unknown;

export interface FeatureFlagProvider {
  getFlag: (key: FeatureFlagKey) => RawFeatureFlagValue;
}

interface PostHogLike {
  getFeatureFlag?: (key: string) => unknown;
  isFeatureEnabled?: (key: string) => boolean;
}

interface LaunchDarklyLike {
  variation?: (key: string, fallback: unknown) => unknown;
}

declare global {
  interface Window {
    __FEATURE_FLAG_OVERRIDES__?: FeatureFlagOverrides;
    posthog?: PostHogLike;
    ldClient?: LaunchDarklyLike;
    LDClient?: LaunchDarklyLike;
  }
}

export class PostHogFeatureFlagAdapter implements FeatureFlagProvider {
  constructor(private readonly client: PostHogLike) {}

  getFlag(key: FeatureFlagKey): RawFeatureFlagValue {
    if (typeof this.client.getFeatureFlag === "function") {
      const value = this.client.getFeatureFlag(key);
      if (value !== undefined) return value;
    }

    if (typeof this.client.isFeatureEnabled === "function") {
      return this.client.isFeatureEnabled(key);
    }

    return undefined;
  }
}

export class LaunchDarklyFeatureFlagAdapter implements FeatureFlagProvider {
  constructor(private readonly client: LaunchDarklyLike) {}

  getFlag(key: FeatureFlagKey): RawFeatureFlagValue {
    if (typeof this.client.variation === "function") {
      return this.client.variation(key, undefined);
    }
    return undefined;
  }
}

let activeProvider: FeatureFlagProvider | null = null;

export const setFeatureFlagProvider = (provider: FeatureFlagProvider | null): void => {
  activeProvider = provider;
};

export const getFeatureFlagProvider = (): FeatureFlagProvider | null => {
  return activeProvider;
};

const isBrowser = (): boolean => typeof window !== "undefined";

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return Math.max(1, parsed);
    }
  }
  return fallback;
};

const parseTrialType = (value: unknown, fallback: TrialType): TrialType => {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "snapshot_count" || normalized === "count_based") return "snapshot_count";
  if (normalized === "single_snapshot" || normalized === "single" || normalized === "one_time") {
    return "single_snapshot";
  }
  if (normalized === "unlimited" || normalized === "none") return "unlimited";

  return fallback;
};

const parsePaywallPlacement = (value: unknown, fallback: PaywallPlacement): PaywallPlacement => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "overlay" || normalized === "inline" || normalized === "promo") {
    return normalized;
  }
  return fallback;
};

const parsePricingTierModel = (value: unknown, fallback: PricingTierModel): PricingTierModel => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "yearly_default" || normalized === "yearly" || normalized === "annual_default") {
    return "yearly_default";
  }
  if (normalized === "monthly_default" || normalized === "monthly") {
    return "monthly_default";
  }
  return fallback;
};

const normalizeFlagValue = <K extends FeatureFlagKey>(
  key: K,
  value: unknown,
  fallback: FeatureFlags[K]
): FeatureFlags[K] => {
  switch (key) {
    case "onboarding_quick_start_enabled":
      return parseBoolean(value, fallback as boolean) as FeatureFlags[K];
    case "free_tier_snapshot_count":
      return parsePositiveInt(value, fallback as number) as FeatureFlags[K];
    case "trial_type":
      return parseTrialType(value, fallback as TrialType) as FeatureFlags[K];
    case "paywall_placement":
      return parsePaywallPlacement(value, fallback as PaywallPlacement) as FeatureFlags[K];
    case "pricing_tier_model":
      return parsePricingTierModel(value, fallback as PricingTierModel) as FeatureFlags[K];
    default:
      return fallback;
  }
};

const readLocalOverrides = (): FeatureFlagOverrides => {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(LOCAL_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as FeatureFlagOverrides;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Ignore invalid override payloads.
  }

  return {};
};

const readWindowOverrides = (): FeatureFlagOverrides => {
  if (!isBrowser()) return {};
  return window.__FEATURE_FLAG_OVERRIDES__ ?? {};
};

const resolveRuntimeProvider = (): FeatureFlagProvider | null => {
  if (activeProvider) return activeProvider;
  if (!isBrowser()) return null;

  if (window.ldClient || window.LDClient) {
    return new LaunchDarklyFeatureFlagAdapter((window.ldClient || window.LDClient) as LaunchDarklyLike);
  }

  if (window.posthog) {
    return new PostHogFeatureFlagAdapter(window.posthog);
  }

  return null;
};

export const setLocalFeatureFlagOverrides = (overrides: FeatureFlagOverrides): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
};

export const clearLocalFeatureFlagOverrides = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LOCAL_OVERRIDE_STORAGE_KEY);
};

// Backward-compatible aliases used by tests and tooling.
export const setFeatureFlagOverrides = setLocalFeatureFlagOverrides;
export const clearFeatureFlagOverrides = clearLocalFeatureFlagOverrides;

export const getFeatureFlags = (overrides: FeatureFlagOverrides = {}): FeatureFlags => {
  const provider = resolveRuntimeProvider();
  const localOverrides = readLocalOverrides();
  const windowOverrides = readWindowOverrides();

  const resolved: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

  for (const key of FEATURE_FLAG_KEYS) {
    const providerValue = provider?.getFlag(key);
    resolved[key] = normalizeFlagValue(key, providerValue, resolved[key]);
  }

  for (const key of FEATURE_FLAG_KEYS) {
    resolved[key] = normalizeFlagValue(key, windowOverrides[key], resolved[key]);
  }

  for (const key of FEATURE_FLAG_KEYS) {
    resolved[key] = normalizeFlagValue(key, localOverrides[key], resolved[key]);
  }

  for (const key of FEATURE_FLAG_KEYS) {
    resolved[key] = normalizeFlagValue(key, overrides[key], resolved[key]);
  }

  return resolved;
};

export const getFeatureFlag = <K extends FeatureFlagKey>(
  key: K,
  overrides: FeatureFlagOverrides = {}
): FeatureFlags[K] => {
  const flags = getFeatureFlags(overrides);
  return flags[key];
};

export const getPaywallPlacement = (overrides: FeatureFlagOverrides = {}): PaywallPlacement => {
  return getFeatureFlag("paywall_placement", overrides);
};

export const shouldUseInlinePaywall = (overrides: FeatureFlagOverrides = {}): boolean => {
  const placement = getPaywallPlacement(overrides);
  return placement === "inline" || placement === "promo";
};

export const isOnboardingQuickStartEnabled = (overrides: FeatureFlagOverrides = {}): boolean => {
  return getFeatureFlag("onboarding_quick_start_enabled", overrides);
};

// Backward-compatible helper used by existing callers.
export const onboardingQuickStartEnabled = isOnboardingQuickStartEnabled;

export const getDefaultCheckoutPlan = (overrides: FeatureFlagOverrides = {}): PlanType => {
  const model = getFeatureFlag("pricing_tier_model", overrides);
  const availablePlans = Object.keys(PRICE_IDS) as PlanType[];

  const yearlyCandidate =
    (availablePlans.find((plan) => plan === ("yearly" as PlanType)) ??
      availablePlans.find((plan) => plan === ("plus" as PlanType)) ??
      availablePlans[0]) as PlanType;

  const monthlyCandidate =
    (availablePlans.find((plan) => plan === ("monthly" as PlanType)) ??
      availablePlans.find((plan) => plan === ("pro" as PlanType)) ??
      availablePlans[availablePlans.length - 1] ??
      yearlyCandidate) as PlanType;

  return model === "monthly_default" ? monthlyCandidate : yearlyCandidate;
};
