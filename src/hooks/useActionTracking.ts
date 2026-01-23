import { useCallback } from "react";
import { useAnalytics } from "./useAnalytics";

/**
 * Specialized hook for tracking user actions and interactions
 * Provides semantic tracking methods for common app flows
 */
export const useActionTracking = () => {
  const { trackEvent, trackPageView } = useAnalytics();

  // Button clicks
  const trackButtonClick = useCallback(
    (buttonName: string, context?: Record<string, any>) => {
      trackEvent("button_click", buttonName, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Quest actions
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

  // Reset flow actions
  const trackResetAction = useCallback(
    (action: "start" | "day_complete" | "abandon" | "complete", dayNumber?: number) => {
      trackEvent("reset", `reset_${action}`, {
        day_number: dayNumber,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Tab navigation - now also tracks as virtual page view for analytics
  const trackTabChange = useCallback(
    (tabName: string, fromTab?: string) => {
      // Track as event (backwards compatible - existing behavior)
      trackEvent("navigation", "tab_change", {
        to_tab: tabName,
        from_tab: fromTab,
        timestamp: Date.now(),
      });
      
      // Also track as virtual page view for page-level analytics
      // This creates entries like /dashboard/experience, /dashboard/guide
      const virtualPath = `/dashboard/${tabName}`;
      trackPageView(virtualPath, true);
    },
    [trackEvent, trackPageView]
  );

  // Feature interactions
  const trackFeatureUse = useCallback(
    (featureName: string, action: string, context?: Record<string, any>) => {
      trackEvent("feature", `${featureName}_${action}`, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Modal interactions
  const trackModalAction = useCallback(
    (modalName: string, action: "open" | "close" | "submit") => {
      trackEvent("modal", `modal_${action}`, {
        modal_name: modalName,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // AI/Guide interactions
  const trackGuideInteraction = useCallback(
    (action: "open" | "message" | "operator_select", operatorName?: string) => {
      trackEvent("guide", `guide_${action}`, {
        operator_name: operatorName,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Build assessment
  const trackBuildAction = useCallback(
    (action: "start" | "answer" | "complete" | "download", context?: Record<string, any>) => {
      trackEvent("build", `build_${action}`, {
        ...context,
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // Time logging
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

  // Integrity/Promise tracking
  const trackPromiseAction = useCallback(
    (action: "create" | "kept" | "broken") => {
      trackEvent("integrity", `promise_${action}`, {
        timestamp: Date.now(),
      });
    },
    [trackEvent]
  );

  // XP earned
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

  // Upgrade/Payment flow
  const trackUpgradeAction = useCallback(
    (action: "view_paywall" | "start_checkout" | "complete_checkout" | "dismiss_paywall") => {
      trackEvent("upgrade", action, {
        timestamp: Date.now(),
      });
    },
    [trackEvent]
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
