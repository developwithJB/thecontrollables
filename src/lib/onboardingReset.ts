export const CURRENT_ONBOARDING_RESET_AT = "2026-06-18T12:45:00.000Z";
export const RESET_ONBOARDING_ENTRY_STEP = "welcome_integrations" as const;

export interface OnboardingResetState {
  onboarding_step?: string | null;
  first_action_completed_at?: string | null;
  journey_selected_at?: string | null;
  build_assessment_completed_at?: string | null;
  operator_onboarding_completed_at?: string | null;
}

const toTime = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export function hasCurrentOnboardingCompletion(
  onboarding: OnboardingResetState | null | undefined,
  resetAt = CURRENT_ONBOARDING_RESET_AT,
): boolean {
  if (!onboarding) return false;
  const resetTime = toTime(resetAt);
  if (resetTime === null) return false;

  return [
    onboarding.first_action_completed_at,
    onboarding.journey_selected_at,
    onboarding.build_assessment_completed_at,
    onboarding.operator_onboarding_completed_at,
  ].some((timestamp) => {
    const time = toTime(timestamp);
    return time !== null && time >= resetTime;
  });
}

export function shouldForceNewOnboardingExperience(
  onboarding: OnboardingResetState | null | undefined,
  resetAt = CURRENT_ONBOARDING_RESET_AT,
): boolean {
  if (!onboarding) return false;
  if (onboarding.onboarding_step !== "completed") return false;

  return !hasCurrentOnboardingCompletion(onboarding, resetAt);
}

export function getEffectiveOnboardingStep<TStep extends string>(
  onboarding: OnboardingResetState | null | undefined,
  fallbackStep: TStep,
): TStep | typeof RESET_ONBOARDING_ENTRY_STEP | string | null {
  if (!onboarding) return null;
  if (shouldForceNewOnboardingExperience(onboarding)) return RESET_ONBOARDING_ENTRY_STEP;
  return onboarding.onboarding_step || fallbackStep;
}
