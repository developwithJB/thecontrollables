import { useCallback } from "react";
import { useAnalytics } from "./useAnalytics";

/**
 * Specialized hook for tracking user actions and interactions
 * Provides semantic tracking methods for common app flows
 */
export const useActionTracking = () => {
  const {
    trackEvent,
    trackPageView,
    trackCheckinCompleted,
    trackPromiseCreated,
    trackPromiseReviewed,
    trackPaywallViewed,
    trackSnapshotCompleted,
  } = useAnalytics();

  const trackButtonClick = useCallback(
    (buttonName: string, context?: Record<string, any>) => {
      trackEvent("button_click", buttonName, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackQuestAction = useCallback(
    (action: "create" | "update" | "complete" | "abandon", questTitle?: string, durationDays?: number) => {
      trackEvent("quest", `quest_${action}`, {
        quest_title: questTitle,
        duration_days: durationDays,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackResetAction = useCallback(
    (action: "start" | "day_complete" | "abandon" | "complete", dayNumber?: number) => {
      const payload = {
        day_number: dayNumber,
        timestamp: Date.now(),
      };

      if (action === "day_complete") {
        trackCheckinCompleted(payload);
      }
      if (action === "complete") {
        trackSnapshotCompleted(payload);
      }

      trackEvent("reset", `reset_${action}`, payload);
    },
    [trackCheckinCompleted, trackEvent, trackSnapshotCompleted]
  );

  const trackTabChange = useCallback(
    (tabName: string, fromTab?: string) => {
      trackEvent("navigation", "tab_change", {
        to_tab: tabName,
        from_tab: fromTab,
        timestamp: Date.now(),
      });

      const virtualPath = `/dashboard/${tabName}`;
      trackPageView(virtualPath, true);
    },
    [trackEvent, trackPageView]
  );

  const trackFeatureUse = useCallback(
    (featureName: string, action: string, context?: Record<string, any>) => {
      trackEvent("feature", `${featureName}_${action}`, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackModalAction = useCallback(
    (modalName: string, action: "open" | "close" | "submit") => {
      if (modalName.toLowerCase().includes("paywall") && action === "open") {
        trackPaywallViewed({ modal_name: modalName, timestamp: Date.now() });
      }

      trackEvent("modal", `modal_${action}`, {
        modal_name: modalName,
        timestamp: Date.now(),
      });
    },
    [trackEvent, trackPaywallViewed]
  );

  const trackGuideInteraction = useCallback(
    (action: "open" | "message" | "operator_select", operatorName?: string) => {
      trackEvent("guide", `guide_${action}`, {
        operator_name: operatorName,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackBuildAction = useCallback(
    (action: "start" | "answer" | "complete" | "download", context?: Record<string, any>) => {
      trackEvent("build", `build_${action}`, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackTimeLog = useCallback(
    (invested: number, wasted: number) => {
      trackEvent("time", "time_logged", {
        invested_minutes: invested,
        wasted_minutes: wasted,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackPromiseAction = useCallback(
    (action: "create" | "kept" | "broken") => {
      const payload = { timestamp: Date.now(), promise_action: action };

      if (action === "create") {
        trackPromiseCreated(payload);
      } else {
        trackPromiseReviewed(payload);
      }

      trackEvent("integrity", `promise_${action}`, payload);
    },
    [trackEvent, trackPromiseCreated, trackPromiseReviewed]
  );

  const trackXpEarned = useCallback(
    (amount: number, source: string) => {
      trackEvent("xp", "xp_earned", {
        amount,
        source,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  const trackUpgradeAction = useCallback(
    (action: "view_paywall" | "start_checkout" | "complete_checkout" | "dismiss_paywall") => {
      const payload = { timestamp: Date.now() };
      if (action === "view_paywall") {
        trackPaywallViewed(payload);
      }
      trackEvent("upgrade", action, payload);
    },
    [trackEvent, trackPaywallViewed]
  );

  return {
    trackButtonClick,
    trackQuestAction,
    trackResetAction,
    trackTabChange,
    trackFeatureUse,
    trackModalAction,
    trackGuideInteraction,
    trackBuildAction,
    trackTimeLog,
    trackPromiseAction,
    trackXpEarned,
    trackUpgradeAction,
  };
};
