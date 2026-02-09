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

  // Track page view - now includes user_id
  // Supports virtual paths for in-page navigation (e.g., tab changes)
  const trackPageView = useCallback(async (pagePath?: string, isVirtual?: boolean) => {
    const path = pagePath || window.location.pathname;
    // For virtual page views (tab changes), don't use load time since it's not a real page load
    const loadTime = isVirtual ? null : Date.now() - pageLoadTime.current;

    try {
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("page_views").insert({
        page_path: path,
        referrer: isVirtual ? window.location.pathname : (document.referrer || null),
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

  // Track custom event - now includes app version and user_id
  const trackEvent = useCallback(
    async (eventType: string, eventName: string, eventData?: EventData) => {
      try {
        // Get current user if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from("app_events").insert({
          event_type: eventType,
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
    },
    []
  );

  // Track error - now includes app version and user_id
  const trackError = useCallback(
    async (
      errorMessage: string,
      errorStack?: string,
      errorType?: string,
      componentName?: string,
      additionalContext?: ErrorContext
    ) => {
      try {
        // Get current user if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
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

  return { trackPageView, trackEvent, trackError, sessionId: sessionId.current };
};

// Global error handler for uncaught errors - includes app version and user_id
export const setupGlobalErrorTracking = () => {
  const sessionId = getSessionId();

  // Helper to check if an error is a benign abort (React Query cancellation etc.)
  const isAbortError = (message: string, error?: Error | unknown): boolean => {
    const msg = message.toLowerCase();
    if (msg.includes("signal is aborted") || msg.includes("the operation was aborted")) return true;
    if (error instanceof DOMException && error.name === "AbortError") return true;
    if (error instanceof Error && error.name === "AbortError") return true;
    return false;
  };

  window.onerror = async (message, source, lineno, colno, error) => {
    const msgStr = String(message);
    if (isAbortError(msgStr, error)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("app_errors").insert({
        error_message: msgStr,
        error_stack: error?.stack || `at ${source}:${lineno}:${colno}`,
        error_type: "uncaught",
        component_name: null,
        page_path: window.location.pathname,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        additional_context: { source, lineno, colno, app_version: APP_VERSION },
        user_id: user?.id || null,
      });
    } catch (e) {
      console.warn("Failed to track uncaught error:", e);
    }
  };

  window.onunhandledrejection = async (event) => {
    const errorMessage =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    
    if (isAbortError(errorMessage, event.reason)) return;
    
    try {
      const errorStack =
        event.reason instanceof Error ? event.reason.stack : undefined;

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("app_errors").insert({
        error_message: errorMessage,
        error_stack: errorStack || null,
        error_type: "unhandled_rejection",
        component_name: null,
        page_path: window.location.pathname,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        additional_context: { app_version: APP_VERSION },
        user_id: user?.id || null,
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
