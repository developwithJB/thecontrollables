import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseWelcomeBackOptions {
  userId: string | null;
  hasActiveSession: boolean;
  todayActionsCompleted: boolean;
}

interface UseWelcomeBackReturn {
  showWelcomeBack: boolean;
  showFollowUp: boolean;
  showReturnBanner: boolean;
  daysSinceLastAction: number;
  dismissWelcomeBack: () => void;
  dismissFollowUp: () => void;
  markFirstActionCompleted: () => void;
}

// Helper to get local date as YYYY-MM-DD
const getLocalDateString = (): string => {
  const now = new Date();
  return now.toLocaleDateString("sv-SE"); // YYYY-MM-DD
};

// Helper to calculate days between two dates
const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / oneDay);
};

/**
 * Hook to manage the "Welcome Back" flow for users returning after 3+ days
 * 
 * Trigger conditions:
 * - User's last completed daily action was ≥ 3 days ago
 * - User has NOT already completed Today's Actions
 * - User has NOT dismissed the flow this session
 * 
 * The flow shows once per return gap (tracked via localStorage)
 */
export function useWelcomeBack({
  userId,
  hasActiveSession,
  todayActionsCompleted,
}: UseWelcomeBackOptions): UseWelcomeBackReturn {
  const today = getLocalDateString();
  
  // Keys for localStorage persistence
  const lastWelcomeBackDateKey = userId ? `welcome_back_shown_${userId}` : null;
  const returnBannerKey = userId ? `return_banner_${userId}_${today}` : null;
  
  // State for flow stages
  const [welcomeBackDismissed, setWelcomeBackDismissed] = useState(false);
  const [followUpDismissed, setFollowUpDismissed] = useState(false);
  const [firstActionCompletedToday, setFirstActionCompletedToday] = useState(false);
  const [hasShownToday, setHasShownToday] = useState(false);

  // Check if we've already shown the welcome back flow recently
  useEffect(() => {
    if (!lastWelcomeBackDateKey) return;
    try {
      const lastShownDate = localStorage.getItem(lastWelcomeBackDateKey);
      if (lastShownDate === today) {
        setHasShownToday(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [lastWelcomeBackDateKey, today]);

  // Check if return banner was dismissed today
  useEffect(() => {
    if (!returnBannerKey) return;
    try {
      const bannerDismissed = localStorage.getItem(returnBannerKey);
      if (bannerDismissed === "1") {
        setFirstActionCompletedToday(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [returnBannerKey]);

  // Query for the last completed daily action
  // Check: daily_checkins, daily_resets, completed_actions, time_logs
  const { data: lastActionDate, isLoading: isLoadingLastAction } = useQuery({
    queryKey: ["last-daily-action", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Query multiple tables to find the most recent activity
      const [checkinsRes, resetsRes, actionsRes, timeLogsRes] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("check_in_date")
          .eq("user_id", userId)
          .order("check_in_date", { ascending: false })
          .limit(1),
        supabase
          .from("daily_resets")
          .select("completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(1),
        supabase
          .from("completed_actions")
          .select("completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(1),
        supabase
          .from("time_logs")
          .select("log_date")
          .eq("user_id", userId)
          .order("log_date", { ascending: false })
          .limit(1),
      ]);

      // Collect all dates
      const dates: Date[] = [];

      if (checkinsRes.data?.[0]?.check_in_date) {
        dates.push(new Date(checkinsRes.data[0].check_in_date));
      }
      if (resetsRes.data?.[0]?.completed_at) {
        dates.push(new Date(resetsRes.data[0].completed_at));
      }
      if (actionsRes.data?.[0]?.completed_at) {
        dates.push(new Date(actionsRes.data[0].completed_at));
      }
      if (timeLogsRes.data?.[0]?.log_date) {
        dates.push(new Date(timeLogsRes.data[0].log_date));
      }

      if (dates.length === 0) return null;

      // Return the most recent date
      return new Date(Math.max(...dates.map((d) => d.getTime())));
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Calculate days since last action
  const daysSinceLastAction = useMemo(() => {
    if (!lastActionDate) return 0;
    return daysBetween(lastActionDate, new Date());
  }, [lastActionDate]);

  // Determine if we should show the welcome back flow
  const showWelcomeBack = useMemo(() => {
    // Don't show if still loading
    if (isLoadingLastAction) return false;
    
    // Don't show if no user
    if (!userId) return false;
    
    // Don't show if already completed today's actions
    if (todayActionsCompleted) return false;
    
    // Don't show if user dismissed it this session
    if (welcomeBackDismissed) return false;
    
    // Don't show if already shown today (prevents re-showing on refresh)
    if (hasShownToday) return false;
    
    // Show if 3+ days since last action
    // Also show if no action history at all (returning after long break)
    if (daysSinceLastAction >= 3) return true;
    
    // Show if user has no recorded actions but has an active session (stale return)
    if (!lastActionDate && hasActiveSession) return true;
    
    return false;
  }, [
    isLoadingLastAction,
    userId,
    todayActionsCompleted,
    welcomeBackDismissed,
    hasShownToday,
    daysSinceLastAction,
    lastActionDate,
    hasActiveSession,
  ]);

  // Show follow-up only after welcome back is dismissed but before entering dashboard
  const showFollowUp = useMemo(() => {
    return welcomeBackDismissed && !followUpDismissed && hasActiveSession;
  }, [welcomeBackDismissed, followUpDismissed, hasActiveSession]);

  // Show banner on first day back (after completing flow, before first action)
  const showReturnBanner = useMemo(() => {
    // Show if we just went through welcome back flow OR if we're on day 1 back
    const wentThroughFlow = welcomeBackDismissed || hasShownToday;
    
    // Don't show if first action already completed
    if (firstActionCompletedToday) return false;
    
    // Show if user recently returned (within current session or today)
    return wentThroughFlow && daysSinceLastAction >= 3;
  }, [welcomeBackDismissed, hasShownToday, firstActionCompletedToday, daysSinceLastAction]);

  // Dismiss welcome back and record to localStorage
  const dismissWelcomeBack = useCallback(() => {
    setWelcomeBackDismissed(true);
    if (lastWelcomeBackDateKey) {
      try {
        localStorage.setItem(lastWelcomeBackDateKey, today);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [lastWelcomeBackDateKey, today]);

  // Dismiss follow-up
  const dismissFollowUp = useCallback(() => {
    setFollowUpDismissed(true);
  }, []);

  // Mark first action completed (hides banner)
  const markFirstActionCompleted = useCallback(() => {
    setFirstActionCompletedToday(true);
    if (returnBannerKey) {
      try {
        localStorage.setItem(returnBannerKey, "1");
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [returnBannerKey]);

  return {
    showWelcomeBack,
    showFollowUp,
    showReturnBanner,
    daysSinceLastAction,
    dismissWelcomeBack,
    dismissFollowUp,
    markFirstActionCompleted,
  };
}
