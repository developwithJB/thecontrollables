import { useCallback, useEffect, useRef } from "react";
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

const getScreenSize = () => {
  return `${window.innerWidth}x${window.innerHeight}`;
};

interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

export const useAnalytics = () => {
  const sessionId = useRef(getSessionId());
  const pageLoadTime = useRef<number>(Date.now());

  // Track page view
  const trackPageView = useCallback(async (pagePath?: string) => {
    const path = pagePath || window.location.pathname;
    const loadTime = Date.now() - pageLoadTime.current;

    try {
      await supabase.from("page_views").insert({
        page_path: path,
        referrer: document.referrer || null,
        session_id: sessionId.current,
        user_agent: navigator.userAgent,
        screen_size: getScreenSize(),
        load_time_ms: loadTime,
      });
    } catch (error) {
      console.warn("Failed to track page view:", error);
    }
  }, []);

  // Track custom event - now includes app version
  const trackEvent = useCallback(
    async (eventType: string, eventName: string, eventData?: EventData) => {
      try {
        await supabase.from("app_events").insert({
          event_type: eventType,
          event_name: eventName,
          event_data: { ...eventData, app_version: APP_VERSION },
          page_path: window.location.pathname,
          session_id: sessionId.current,
          user_agent: navigator.userAgent,
          screen_size: getScreenSize(),
        });
      } catch (error) {
        console.warn("Failed to track event:", error);
      }
    },
    []
  );

  // Track error - now includes app version
  const trackError = useCallback(
    async (
      errorMessage: string,
      errorStack?: string,
      errorType?: string,
      componentName?: string,
      additionalContext?: ErrorContext
    ) => {
      try {
        await supabase.from("app_errors").insert({
          error_message: errorMessage,
          error_stack: errorStack || null,
          error_type: errorType || "runtime",
          component_name: componentName || null,
          page_path: window.location.pathname,
          session_id: sessionId.current,
          user_agent: navigator.userAgent,
          additional_context: { ...additionalContext, app_version: APP_VERSION },
        });
      } catch (error) {
        console.warn("Failed to track error:", error);
      }
    },
    []
  );

  return { trackPageView, trackEvent, trackError, sessionId: sessionId.current };
};

// Global error handler for uncaught errors - includes app version
export const setupGlobalErrorTracking = () => {
  const sessionId = getSessionId();

  window.onerror = async (message, source, lineno, colno, error) => {
    try {
      await supabase.from("app_errors").insert({
        error_message: String(message),
        error_stack: error?.stack || `at ${source}:${lineno}:${colno}`,
        error_type: "uncaught",
        component_name: null,
        page_path: window.location.pathname,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        additional_context: { source, lineno, colno, app_version: APP_VERSION },
      });
    } catch (e) {
      console.warn("Failed to track uncaught error:", e);
    }
  };

  window.onunhandledrejection = async (event) => {
    try {
      const errorMessage =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      const errorStack =
        event.reason instanceof Error ? event.reason.stack : undefined;

      await supabase.from("app_errors").insert({
        error_message: errorMessage,
        error_stack: errorStack || null,
        error_type: "unhandled_rejection",
        component_name: null,
        page_path: window.location.pathname,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        additional_context: { app_version: APP_VERSION },
      });
    } catch (e) {
      console.warn("Failed to track unhandled rejection:", e);
    }
  };
};

// Hook to track page view on mount
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
