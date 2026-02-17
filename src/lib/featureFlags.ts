const asBool = (value?: string | null): boolean => {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const onboardingQuickStartEnabled = (): boolean => {
  const envEnabled = asBool(import.meta.env.VITE_ONBOARDING_QUICK_START_ENABLED);

  if (typeof window === "undefined") {
    return envEnabled;
  }

  const queryOverride = new URLSearchParams(window.location.search).get("onboarding_quick_start_enabled");
  if (queryOverride !== null) return asBool(queryOverride);

  const storageOverride = localStorage.getItem("onboarding_quick_start_enabled");
  if (storageOverride !== null) return asBool(storageOverride);

  return envEnabled;
};
