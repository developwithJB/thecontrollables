import { describe, expect, it } from "vitest";
import {
  CURRENT_ONBOARDING_RESET_AT,
  RESET_ONBOARDING_ENTRY_STEP,
  getEffectiveOnboardingStep,
  hasCurrentOnboardingCompletion,
  shouldForceNewOnboardingExperience,
} from "@/lib/onboardingReset";

describe("onboarding reset epoch", () => {
  it("forces users who completed onboarding before the relaunch back into onboarding", () => {
    expect(
      shouldForceNewOnboardingExperience({
        onboarding_step: "completed",
        first_action_completed_at: "2026-06-17T12:00:00.000Z",
        journey_selected_at: "2026-06-17T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("does not reset users who completed the current onboarding epoch", () => {
    expect(
      shouldForceNewOnboardingExperience({
        onboarding_step: "completed",
        first_action_completed_at: "2026-06-18T13:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("does not interfere with users already inside onboarding", () => {
    expect(
      shouldForceNewOnboardingExperience({
        onboarding_step: "welcome_integrations",
        first_action_completed_at: null,
      }),
    ).toBe(false);
  });

  it("uses the reset entry step when old completion markers are stale", () => {
    expect(
      getEffectiveOnboardingStep(
        {
          onboarding_step: "completed",
          operator_onboarding_completed_at: "2026-06-01T00:00:00.000Z",
        },
        RESET_ONBOARDING_ENTRY_STEP,
      ),
    ).toBe(RESET_ONBOARDING_ENTRY_STEP);
  });

  it("recognizes any current completion marker after the reset timestamp", () => {
    expect(
      hasCurrentOnboardingCompletion({
        onboarding_step: "completed",
        build_assessment_completed_at: CURRENT_ONBOARDING_RESET_AT,
      }),
    ).toBe(true);
  });
});
