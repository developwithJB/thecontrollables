import { useCallback } from "react";
import { useAnalytics } from "./useAnalytics";

/**
 * Specialized hook for tracking onboarding funnel events
 * Tracks: Account Created → Assessment Done → Archetype Shown → Snapshot Selected → Day 1 Started
 */
export const useOnboardingAnalytics = () => {
  const { trackEvent } = useAnalytics();

  // Track account creation (called after successful signup)
  const trackAccountCreated = useCallback(
    (source?: string) => {
      trackEvent("onboarding", "account_created", {
        source: source || "direct",
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track Build Assessment completion
  const trackAssessmentCompleted = useCallback(
    (archetype?: string) => {
      trackEvent("onboarding", "assessment_completed", {
        archetype,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track assessment skipped
  const trackAssessmentSkipped = useCallback(() => {
    trackEvent("onboarding", "assessment_skipped", {
      timestamp: Date.now(),
    });
  }, [trackEvent]);

  // Track Archetype Result viewed/acknowledged
  const trackArchetypeViewed = useCallback(
    (archetype: string) => {
      trackEvent("onboarding", "archetype_viewed", {
        archetype,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track Journey/Snapshot selection
  const trackSnapshotSelected = useCallback(
    (journeyId: string, journeyTitle: string, isRecommended: boolean) => {
      trackEvent("onboarding", "snapshot_selected", {
        journey_id: journeyId,
        journey_title: journeyTitle,
        is_recommended: isRecommended,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track Day 1 started (onboarding complete)
  const trackOnboardingComplete = useCallback(
    (journeyId: string, skippedAssessment: boolean) => {
      trackEvent("onboarding", "day1_started", {
        journey_id: journeyId,
        skipped_assessment: skippedAssessment,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track onboarding step changes
  const trackStepChange = useCallback(
    (fromStep: string, toStep: string) => {
      trackEvent("onboarding", "step_change", {
        from_step: fromStep,
        to_step: toStep,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Track recovery/retry events
  const trackRecoveryAttempt = useCallback(
    (step: string, success: boolean) => {
      trackEvent("onboarding", "recovery_attempt", {
        step,
        success,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  return {
    trackAccountCreated,
    trackAssessmentCompleted,
    trackAssessmentSkipped,
    trackArchetypeViewed,
    trackSnapshotSelected,
    trackOnboardingComplete,
    trackStepChange,
    trackRecoveryAttempt,
  };
};
