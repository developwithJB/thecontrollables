import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes (shorter for iOS PWA reliability)

/**
 * Hook that handles app resume from background state.
 * Refreshes auth session and invalidates stale queries when returning
 * after being backgrounded for more than 5 minutes.
 */
export function useAppResume() {
  const queryClient = useQueryClient();
  const lastVisibleRef = useRef(Date.now());
  const isRefreshingRef = useRef(false);

  const handleResume = useCallback(async () => {
    // Prevent duplicate refreshes
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      console.log("[useAppResume] Refreshing session and data after resume");
      
      // Actually refresh the auth token (getSession only returns cached token)
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("[useAppResume] Session refresh error:", error);
        // If refresh fails, try getSession as fallback
        const { error: fallbackError } = await supabase.auth.getSession();
        if (fallbackError) {
          console.error("[useAppResume] Fallback session error:", fallbackError);
        }
      } else {
        console.log("[useAppResume] Session refreshed successfully", { userId: data.session?.user?.id });
      }
      
      // Invalidate all active queries to get fresh data
      await queryClient.invalidateQueries({ type: "active" });
    } catch (error) {
      console.error("[useAppResume] Resume handler error:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App backgrounded - record the time
        lastVisibleRef.current = Date.now();
        console.log("[useAppResume] App backgrounded");
      } else {
        // App resumed - check how long we were hidden
        const hiddenDuration = Date.now() - lastVisibleRef.current;
        console.log(`[useAppResume] App resumed after ${Math.round(hiddenDuration / 1000)}s`);
        
        if (hiddenDuration > STALE_THRESHOLD) {
          handleResume();
        }
      }
    };

    // Also handle page focus events for desktop browsers
    const handleFocus = () => {
      const hiddenDuration = Date.now() - lastVisibleRef.current;
      if (hiddenDuration > STALE_THRESHOLD && !document.hidden) {
        handleResume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [handleResume]);
}
