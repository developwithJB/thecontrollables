import { useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";

// Generate a session ID for tracking (persists across page loads in same tab)
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("app_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("app_session_id", sessionId);
  }
  return sessionId;
};

const getScreenSize = () => `${window.innerWidth}x${window.innerHeight}`;

interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

const ENABLE_SUPABASE_ANALYTICS = import.meta.env.VITE_ENABLE_SUPABASE_ANALYTICS === "true";

const capturePosthogEvent = (eventName: string, eventData?: EventData) => {
  posthog.capture(eventName, {
    ...eventData,
    app_version: APP_VERSION,
    page_path: window.location.pathname,
  });
};

export const captureHandledException = (
  error: unknown,
  context?: ErrorContext,
  level: "error" | "warning" = "error"
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("error_context", context);
    }
    scope.setTag("app_version", APP_VERSION);
    scope.setLevel(level);
    Sentry.captureException(error);
  });
};

export const useAnalytics = () => {
  const sessionId = useRef(getSessionId());
  const pageLoadTime = useRef<number>(Date.now());

  const trackPageView = useCallback(async (pagePath?: string, isVirtual?: boolean) => {
    const path = pagePath || window.location.pathname;
    const loadTime = isVirtual ? null : Date.now() - pageLoadTime.current;

    capturePosthogEvent("page_viewed", {
      path,
      is_virtual: !!isVirtual,
      load_time_ms: loadTime ?? undefined,
      referrer: isVirtual ? window.location.pathname : document.referrer || null,
    });

    if (!ENABLE_SUPABASE_ANALYTICS) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("page_views").insert({
        page_path: path,
        referrer: isVirtual ? window.location.pathname : document.referrer || null,
        session_id: sessionId.current,
        user_agent: navigator.userAgent,
        screen_size: getScreenSize(),
        load_time_ms: loadTime,
        user_id: user?.id || null,
      });
    } catch (error) {
      console.warn("Failed to track page view:", error);
    }
  }, []);

  const trackEvent = useCallback(async (_eventType: string, eventName: string, eventData?: EventData) => {
    capturePosthogEvent(eventName, eventData);

    if (!ENABLE_SUPABASE_ANALYTICS) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("app_events").insert({
        event_type: _eventType,
        event_name: eventName,
        event_data: { ...eventData, app_version: APP_VERSION },
        page_path: window.location.pathname,
        session_id: sessionId.current,
        user_agent: navigator.userAgent,
        screen_size: getScreenSize(),
        user_id: user?.id || null,
      });
    } catch (error) {
      console.warn("Failed to track event:", error);
    }
  }, []);

  const trackError = useCallback(
    async (
      errorMessage: string,
      errorStack?: string,
      errorType?: string,
      componentName?: string,
      additionalContext?: ErrorContext
    ) => {
      Sentry.withScope((scope) => {
        if (additionalContext) {
          scope.setContext("additional_context", additionalContext);
        }
        scope.setTag("error_type", errorType || "runtime");
        if (componentName) {
          scope.setTag("component_name", componentName);
        }
        scope.setTag("app_version", APP_VERSION);
        Sentry.captureMessage(errorMessage, "error");
      });

      if (!ENABLE_SUPABASE_ANALYTICS) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("app_errors").insert({
          error_message: errorMessage,
          error_stack: errorStack || null,
          error_type: errorType || "runtime",
          component_name: componentName || null,
          page_path: window.location.pathname,
          session_id: sessionId.current,
          user_agent: navigator.userAgent,
          additional_context: { ...additionalContext, app_version: APP_VERSION },
          user_id: user?.id || null,
        });
      } catch (error) {
        console.warn("Failed to track error:", error);
      }
    },
    []
  );

  const trackUserSignedUp = useCallback((props?: EventData) => trackEvent("conversion", "user_signed_up", props), [trackEvent]);
  const trackAssessmentCompleted = useCallback((props?: EventData) => trackEvent("assessment", "assessment_completed", props), [trackEvent]);
  const trackSnapshotStarted = useCallback((props?: EventData) => trackEvent("snapshot", "snapshot_started", props), [trackEvent]);
  const trackCheckinCompleted = useCallback((props?: EventData) => trackEvent("habit", "checkin_completed", props), [trackEvent]);
  const trackPromiseCreated = useCallback((props?: EventData) => trackEvent("integrity", "promise_created", props), [trackEvent]);
  const trackPromiseReviewed = useCallback((props?: EventData) => trackEvent("integrity", "promise_reviewed", props), [trackEvent]);
  const trackPaywallViewed = useCallback((props?: EventData) => trackEvent("monetization", "paywall_viewed", props), [trackEvent]);
  const trackSnapshotCompleted = useCallback((props?: EventData) => trackEvent("snapshot", "snapshot_completed", props), [trackEvent]);

  return {
    trackPageView,
    trackEvent,
    trackError,
    trackUserSignedUp,
    trackAssessmentCompleted,
    trackSnapshotStarted,
    trackCheckinCompleted,
    trackPromiseCreated,
    trackPromiseReviewed,
    trackPaywallViewed,
    trackSnapshotCompleted,
    sessionId: sessionId.current,
  };
};

export const setupGlobalErrorTracking = () => {
  const isAbortError = (message: string, error?: Error | unknown): boolean => {
    const msg = message.toLowerCase();
    if (msg.includes("signal is aborted") || msg.includes("the operation was aborted")) return true;
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return false;
  };

  window.onerror = (message, source, lineno, colno, error) => {
    const msgStr = String(message);
    if (isAbortError(msgStr, error)) return;

    Sentry.captureException(error ?? new Error(msgStr), {
      tags: { error_type: "uncaught", app_version: APP_VERSION },
      extra: { source, lineno, colno },
    });
  };

  window.onunhandledrejection = (event) => {
    const errorMessage = event.reason instanceof Error ? event.reason.message : String(event.reason);
    if (isAbortError(errorMessage, event.reason)) return;

    captureHandledException(event.reason instanceof Error ? event.reason : new Error(errorMessage), {
      rejection_type: "unhandled_rejection",
      app_version: APP_VERSION,
    });
  };
};

export const usePageViewTracking = (pageName?: string) => {
  const { trackPageView, trackEvent } = useAnalytics();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true;
      trackPageView();
      if (pageName) {
        trackEvent("navigation", "page_load", { page_name: pageName });
      }
    }
  }, [trackPageView, trackEvent, pageName]);
};
