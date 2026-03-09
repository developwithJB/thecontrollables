import { useEffect, useCallback, useMemo, lazy, Suspense, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { Book, BookOpen, Sparkles, RefreshCw, Settings, Target, Pencil, Check, X, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useWelcomeBack } from "@/hooks/useWelcomeBack";
import { WelcomeBackScreen, WelcomeBackFollowUp, WelcomeBackBanner } from "@/components/welcome-back";

import { useBadges } from "@/hooks/useBadges";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useActionTracking } from "@/hooks/useActionTracking";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { canStartNewSnapshot, hasUsedFreeTrial, isInActiveTrial } from "@/lib/entitlements";
import { getDefaultCheckoutPlan, onboardingQuickStartEnabled, shouldUseInlinePaywall } from "@/lib/featureFlags";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useDashboardVisitCount } from "@/hooks/useDashboardVisitCount";
import { supabase } from "@/integrations/supabase/client";
import { getDayContent, RESET_DAYS } from "@/lib/resetContent";
import { getJourneyById } from "@/lib/guidedJourneys";
import { APP_VERSION } from "@/lib/version";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

// Dashboard modules
import { MainQuestModule } from "@/components/dashboard/MainQuestModule";
import { XpMomentumModule } from "@/components/dashboard/XpMomentumModule";
import { IntegrityMeterModule, IntegrityMeterModuleHandle } from "@/components/dashboard/IntegrityMeterModule";
import { TimeCurrencyModule, TimeCurrencyModuleHandle } from "@/components/dashboard/TimeCurrencyModule";
import { BuildOverviewModule, BuildOverviewModuleHandle } from "@/components/dashboard/BuildOverviewModule";
import { ResetProgressModule } from "@/components/dashboard/ResetProgressModule";
import { BuildEntryPoint } from "@/components/dashboard/BuildEntryPoint";
import { SnapshotSelector } from "@/components/dashboard/SnapshotSelector";
import { StartSnapshotDialog } from "@/components/dashboard/StartSnapshotDialog";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
// DailyCheckinCard removed - functionality merged into TodayActions
import { TodayActions } from "@/components/dashboard/TodayActions";
import { SnapshotReviewCard } from "@/components/dashboard/SnapshotReviewCard";
import { TrialCompleteCard } from "@/components/dashboard/TrialCompleteCard";

// JourneyChangesLog removed - consolidated into Activity History

import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { MealPlanCard } from "@/components/nutrition/MealPlanCard";
import { BrainBodyTracker } from "@/components/dashboard/BrainBodyTracker";
import { useWellness } from "@/hooks/useWellness";
import { WellnessGoalsCard } from "@/components/dashboard/WellnessGoalsCard";
import { PlannerCard } from "@/components/dashboard/PlannerCard";

import { GameRulesSection } from "@/components/GameRulesSection";
import { DailyAlignmentPromo } from "@/components/dashboard/DailyAlignmentPromo";
import { DailyAlignmentSpotlight } from "@/components/dashboard/DailyAlignmentSpotlight";
import { DashboardManualSection } from "@/components/DashboardManualSection";
import { InstallNudge } from "@/components/pwa/InstallNudge";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { WhatsNewModal, WhatsNewTrigger } from "@/components/WhatsNewModal";
import {
  MainQuestSkeleton,
  ResetProgressSkeleton,
  SmallModuleSkeleton,
  AIGuideSkeleton,
} from "@/components/dashboard/DashboardSkeletons";

// Lazy load heavy components
import { LazyAIGuidePanelWrapper } from "@/components/dashboard/LazyAIGuidePanel";
import type { AIGuidePanelHandle } from "@/components/dashboard/AIGuidePanel";
import {
  LazyActivityHistory,
  LazyBadgesEarned,
  LazyCertificates,
  LazySnapshotHistory,
  LazyInsightsAtAGlance,
  SuspenseExperienceComponent,
  ExperienceLoadingSkeleton,
} from "@/components/experience/LazyExperienceComponents";

// Experience tab components (lighter ones loaded normally)
import { TimeCycleCard } from "@/components/experience/TimeCycleCard";
import { LockedOverlay } from "@/components/experience/LockedOverlay";
import { PullToRefreshIndicator } from "@/components/pwa/PullToRefreshIndicator";
import { OnboardingFlow, OnboardingQuickStartFlow } from "@/components/onboarding";
import { CircleCard } from "@/components/dashboard/CircleCard";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { ControllableLevelsTeaser } from "@/components/dashboard/ControllableLevelsTeaser";
import { useCircle } from "@/hooks/useCircle";
import { SeasonBanner } from "@/components/dashboard/SeasonBanner";
import { SeasonComplete } from "@/components/SeasonComplete";
import { useSeason } from "@/hooks/useSeason";
import { WellnessStreakHistory } from "@/components/experience/WellnessStreakHistory";
import { StreakCelebration } from "@/components/experience/StreakCelebration";

const STREAK_MILESTONE_XP: Record<number, number> = { 7: 50, 14: 100, 30: 200 };

type TabType = "dashboard" | "experience" | "guide";

export default function Dashboard() {
  usePageViewTracking("Dashboard");
  const { trackEvent } = useAnalytics();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [prevTab, setPrevTab] = useState<TabType | null>(null);
  const [showJourneySwitcher, setShowJourneySwitcher] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showMissionEdit, setShowMissionEdit] = useState(false);
  const [editingMissionTitle, setEditingMissionTitle] = useState("");
  const [showInsights, setShowInsights] = useState(false); // Analytics cards hidden by default
  // Refs for imperative dialog triggers
  const timeCurrencyRef = useRef<TimeCurrencyModuleHandle>(null);
  const integrityRef = useRef<IntegrityMeterModuleHandle>(null);
  const buildRef = useRef<BuildOverviewModuleHandle>(null);
  const aiGuidePanelRef = useRef<AIGuidePanelHandle>(null);
  
  // Track when user sends a message to The Controllables today (for Today Actions completion)
  const todayLocal = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (local)
  const askGuideStorageKey = user?.id ? `today_actions_ask_guide_${user.id}_${todayLocal}` : null;
  const [askGuideCompletedToday, setAskGuideCompletedToday] = useState(false);
  
  // Read initial value from localStorage
  useEffect(() => {
    if (!askGuideStorageKey) return;
    try {
      setAskGuideCompletedToday(localStorage.getItem(askGuideStorageKey) === "1");
    } catch {
      // ignore
    }
  }, [askGuideStorageKey]);
  
  // Handler to mark ask guide as completed
  const handleAskGuideMessageSent = useCallback(() => {
    if (askGuideStorageKey) {
      try {
        localStorage.setItem(askGuideStorageKey, "1");
      } catch {
        // ignore
      }
    }
    setAskGuideCompletedToday(true);
  }, [askGuideStorageKey]);
  
  // Track dashboard visits for conditional microcopy placement
  const dashboardVisitCount = useDashboardVisitCount();

  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Action tracking
  const { 
    trackTabChange, 
    trackQuestAction, 
    trackResetAction, 
    trackTimeLog,
    trackPromiseAction,
    trackGuideInteraction,
    trackButtonClick,
  } = useActionTracking();

  // Reset data
  const {
    activeSession,
    currentDay,
    isCompleted,
    isExpired,
    isLoading: resetLoading,
    completedDays,
    acceptCovenant,
    isAcceptingCovenant,
  } = useReset(user?.id || null);

  // Prevent Day 7 celebration redirect loops by remembering if this session's celebration was already shown.
  const day7CelebrationSeenKey = useMemo(() => {
    if (!user?.id || !activeSession?.id) return null;
    return `day7_celebration_seen_${user.id}_${activeSession.id}`;
  }, [user?.id, activeSession?.id]);

  const triggerDay7Celebration = useCallback(() => {
    if (day7CelebrationSeenKey) {
      let alreadySeen = false;
      try {
        alreadySeen = localStorage.getItem(day7CelebrationSeenKey) === "1";
      } catch {
        // ignore
      }
      if (!alreadySeen) {
        try {
          alreadySeen = sessionStorage.getItem(day7CelebrationSeenKey) === "1";
        } catch {
          // ignore
        }
      }
      if (alreadySeen) return;

      // Mark as seen (best effort)
      try {
        localStorage.setItem(day7CelebrationSeenKey, "1");
      } catch {
        try {
          sessionStorage.setItem(day7CelebrationSeenKey, "1");
        } catch {
          // ignore
        }
      }
    }

    navigate("/reset?day7complete=true", { replace: true });
  }, [day7CelebrationSeenKey, navigate]);

  // Life dashboard data - single optimized query
  const {
    isLoading: dashboardLoading,
    isAuthReady,
    activeQuest,
    createQuest,
    isCreatingQuest,
    updateQuest,
    isUpdatingQuest,
    completeQuest,
    isCompletingQuest,
    totalXp,
    xpLogs,
    integrityScore,
    integrityLogs,
    pendingPromises,
    todayPromiseMade, // NEW: timezone-aware flag from server
    consecutiveStreak, // NEW: actual consecutive days checked in
    createPromise,
    resolvePromise,
    todayTimeLog,
    logTime,
    isLoggingTime,
  } = useDashboardSummary(user?.id || null);

  const { streak: wellnessStreak, logWellness, recentLogs: wellnessLogs, hitMilestone, clearMilestone } = useWellness(user?.id);

  // Build data for The Controllables
  const { currentBuild, buildLoading } = useBuildAssessment();

  // Badges system
  const {
    earnedBadges,
    isLoading: badgesLoading,
    awardBadge,
    checkReturnedBadge,
    checkProtectedTimeBadge,
    checkAskedGuidanceBadge,
    hasBadge,
  } = useBadges(user?.id || null);

  // Onboarding / Simplified mode
  const {
    isSimplifiedMode,
    isLoading: onboardingLoading,
    completeOnboarding,
    ensureOnboardingRecord,
    needsOnboarding,
    currentOnboardingStep,
    updateOnboardingProgress,
    journeyControllable,
  } = useOnboarding(user?.id || null);

  // Entitlements (free vs paid)
  const { isPaid, isLoading: entitlementsLoading, initiateCheckout, isCheckingOut } = useEntitlements(user?.id || null);

  // Snapshot Circles
  const {
    myCircle,
    circleMembers,
    showedUpTodayCount,
    streakLeaderboard,
    createCircle,
    isCreatingCircle,
    joinCircle,
    isJoiningCircle,
    leaveCircle,
    isLeavingCircle,
    logShowedUp,
    lookupCircle,
  } = useCircle(user?.id || undefined, activeSession?.id);

  // 4-Week Seasons
  const {
    activeSeason,
    seasonSnapshots,
    seasonProgress,
    isStartingSeason,
    startSeason,
    linkSnapshotToSeason,
    completeSeason,
    shouldShowSeasonComplete,
  } = useSeason(user?.id || undefined);
  const [showSeasonComplete, setShowSeasonComplete] = useState(false);
  useEffect(() => {
    if (shouldShowSeasonComplete) {
      setShowSeasonComplete(true);
      completeSeason();
    }
  }, [shouldShowSeasonComplete, completeSeason]);

  // Handle ?join=CODE URL param for circle invites
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const joinCodeFromUrl = searchParams.get("join");
  useEffect(() => {
    if (joinCodeFromUrl && user?.id) {
      setJoinDialogOpen(true);
    }
  }, [joinCodeFromUrl, user?.id]);

  // Auto-log showed-up when daily reset is completed
  const prevCompletedDaysRef = useRef<number>(0);
  useEffect(() => {
    if (!completedDays || !myCircle) return;
    const count = completedDays.length;
    if (count > prevCompletedDaysRef.current && count > 0) {
      logShowedUp(count);
    }
    prevCompletedDaysRef.current = count;
  }, [completedDays?.length, myCircle, logShowedUp]);

  // Get user display name for circles
  const circleDisplayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";

  // Fetch profile for nudge status (used by spotlight and welcome back)
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-nudge-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("email_nudge_enabled, nudge_frequency")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const nudgeEnabled = userProfile?.email_nudge_enabled ?? false;

  // Quick-enable Daily Alignment handler
  const handleEnableDailyAlignment = useCallback(async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("profiles")
      .update({ email_nudge_enabled: true, nudge_frequency: "daily" })
      .eq("id", user.id);
    if (!error) {
      toast({
        title: "Daily Alignment enabled",
        description: "Your first email arrives tomorrow morning.",
      });
      trackEvent("feature_activation", "daily_alignment_enabled");
      refetchProfile();
    }
  }, [user?.id, toast, trackEvent, refetchProfile]);
  // Check if today's actions are completed (for welcome back trigger logic)
  const todayActionsCompleted = useMemo(() => {
    // For now, just check if they've logged time or done a checkin
    return !!todayTimeLog;
  }, [todayTimeLog]);

  // Welcome Back flow for returning users (3+ days since last action)
  const {
    showWelcomeBack,
    showFollowUp,
    showReturnBanner,
    daysSinceLastAction,
    dismissWelcomeBack,
    dismissFollowUp,
    markFirstActionCompleted,
  } = useWelcomeBack({
    userId: user?.id || null,
    hasActiveSession: !!activeSession,
    activeSessionCreatedAt: activeSession?.created_at || null,
    todayActionsCompleted,
  });

  // PWA Install - check if user has completed meaningful action
  const hasCompletedMeaningfulAction = useMemo(() => {
    // Created a quest
    if (activeQuest) return true;
    // Completed at least Day 1 of reset
    if (completedDays && completedDays.length > 0) return true;
    // Has XP logs (indicates activity)
    if (xpLogs && xpLogs.length > 0) return true;
    return false;
  }, [activeQuest, completedDays, xpLogs]);

  const {
    showNudge: showInstallNudge,
    isIOSDevice,
    handleInstall,
    handleDismiss: handleInstallDismiss,
  } = usePWAInstall({
    isAuthenticated: !!user,
    hasCompletedMeaningfulAction,
  });

  // Online status for pull-to-refresh
  const isOnline = useOnlineStatus();

  // Pull-to-refresh for mobile
  const handlePullRefresh = useCallback(async () => {
    // Use a timeout to ensure refresh never hangs on iOS PWA
    const refreshPromise = queryClient.refetchQueries({ type: 'active' });
    
    // Race between actual refresh and a safety timeout (8 seconds max)
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn("Refresh timeout - forcing completion");
        resolve();
      }, 8000);
    });

    try {
      await Promise.race([refreshPromise, timeoutPromise]);
    } catch (error) {
      console.error("Refresh error:", error);
    }
    
    toast({
      title: "Refreshed",
      description: "Data updated successfully.",
    });
  }, [queryClient, toast]);

  const {
    containerRef: pullRefreshRef,
    isRefreshing: isPullRefreshing,
    pullProgress,
    pullDistance,
    triggerRefresh,
  } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    threshold: 80,
  });

  // Callback to refresh XP when actions are completed
  const handleXpEarned = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["xp-logs", user?.id] });
    // Check badges that might be earned
    checkAskedGuidanceBadge();
  }, [queryClient, user?.id, checkAskedGuidanceBadge]);

  // Fetch all reset sessions for history - defer until Experience tab is active
  const { data: allSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["all-reset-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    // We also need session history on the Dashboard tab to:
    // - show the Snapshot Review card for post-trial users
    // - enforce post-trial lockdown consistently
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Free trial is considered "ended" once the user has ANY ended session.
  // (They may still have an "active" row due to older data/loopholes; UI should still
  // prioritize the ended snapshot for review.)
  const hasEndedTrial = useMemo(() => {
    if (isPaid) return false;
    return allSessions.some((s) => s.status === "completed" || s.status === "expired" || s.status === "paused");
  }, [allSessions, isPaid]);

  const freeTrialUsed = useMemo(() => {
    return hasUsedFreeTrial(isPaid, allSessions.length);
  }, [isPaid, allSessions.length]);

  const canStartSnapshot = useMemo(() => {
    return canStartNewSnapshot(isPaid, allSessions.length);
  }, [isPaid, allSessions.length]);

  // Is the user currently in an active free trial?
  const isTrialing = useMemo(() => {
    return isInActiveTrial(isPaid, !!activeSession, isCompleted, isExpired, allSessions.length);
  }, [isPaid, activeSession, isCompleted, isExpired, allSessions.length]);

  const defaultCheckoutPlan = getDefaultCheckoutPlan();
  const useInlinePaywall = shouldUseInlinePaywall();
  const showOverlayPaywall = !useInlinePaywall;
  const showDashboardPaywallPromo = useInlinePaywall;

  const startCheckout = useCallback(
    (plan?: Parameters<typeof initiateCheckout>[0], source = "dashboard") => {
      void initiateCheckout(plan ?? defaultCheckoutPlan, { source });
    },
    [initiateCheckout, defaultCheckoutPlan],
  );

  // Fetch completed days per session for history - defer until Experience tab is active
  const { data: allCompletedDays = [] } = useQuery({
    queryKey: ["all-completed-days", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("daily_resets")
        .select("session_id, day_number")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && activeTab === "experience",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    let isMounted = true;

    // 1. Set up listener FIRST for ongoing auth changes (does NOT control isLoading)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session && event !== "INITIAL_SESSION") {
        navigate("/auth");
      }
      // Don't set isAuthLoading here - let initializeAuth control it
    });

    // 2. INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session) {
          setUser(session.user);
          // Fire-and-forget refresh to validate token (non-blocking)
          supabase.auth.refreshSession().then(({ data, error }) => {
            if (!isMounted) return;
            if (error) {
              console.warn("Session refresh failed on init:", error.message);
            } else if (data.session) {
              setUser(data.session.user);
            }
          });
        } else {
          navigate("/auth");
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (isMounted) navigate("/auth");
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };

    initializeAuth();

    // Safety timeout - never get stuck loading (3s for mobile PWA)
    const timeout = setTimeout(() => {
      if (isMounted && isAuthLoading) {
        console.warn("Auth loading timeout - forcing completion");
        setIsAuthLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  // Initialize onboarding record and check "returned" badge on mount
  useEffect(() => {
    if (user?.id) {
      ensureOnboardingRecord();
      checkReturnedBadge();
    }
  }, [user?.id, ensureOnboardingRecord, checkReturnedBadge]);

  // Track daily return event for retention analytics
  useEffect(() => {
    if (!user?.id || dashboardLoading) return;
    const lastVisitKey = `last_dashboard_visit_${user.id}`;
    const now = new Date();
    const todayStr = now.toLocaleDateString("sv-SE");
    try {
      const lastVisit = localStorage.getItem(lastVisitKey);
      if (lastVisit !== todayStr) {
        const daysSince = lastVisit
          ? Math.floor((now.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        trackEvent("retention", "daily_return", {
          days_since_last_visit: daysSince,
          current_snapshot_day: activeSession ? currentDay : null,
          has_active_session: !!activeSession,
        });
        localStorage.setItem(lastVisitKey, todayStr);
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.id, dashboardLoading, trackEvent, activeSession, currentDay]);

  // Check for openFocus query param (from Reset page navigation)
  useEffect(() => {
    if (searchParams.get("openFocus") === "1" && activeSession) {
      setShowJourneySwitcher(true);
      // Remove the query param to prevent re-opening on refresh
      searchParams.delete("openFocus");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, activeSession]);
  
  // Check for Day 7 reading completion signal - immediately trigger celebration
  // This handles the case where user just completed Day 7 reading from Reset page
  useEffect(() => {
    if (searchParams.get("day7reading") !== "done") return;

    // Always clear the query param so it can't re-trigger (e.g., via back/forward navigation).
    const next = new URLSearchParams(searchParams);
    next.delete("day7reading");
    setSearchParams(next, { replace: true });

    if (currentDay === 7) {
      // Day 7 reading was just completed - navigate to celebration immediately.
      triggerDay7Celebration();
    }
  }, [searchParams, currentDay, setSearchParams, triggerDay7Celebration]);

  // Handle wearable OAuth callback (Fitbit/Oura redirect)
  useEffect(() => {
    const connected = searchParams.get("wearable_connected");
    const wearableError = searchParams.get("wearable_error");
    if (connected) {
      toast({
        title: `${connected === "fitbit" ? "Fitbit" : "Oura Ring"} connected!`,
        description: "Tap Sync Now in Health Data to pull your latest data.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_connected");
      setSearchParams(next, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["wearable-connections"] });
    } else if (wearableError) {
      toast({
        title: "Connection failed",
        description: `Could not connect: ${wearableError}`,
        variant: "destructive",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // Handle quest creation - award badge and complete onboarding
  const handleCreateQuest = useCallback(
    (data: { title: string; durationDays: number }) => {
      createQuest(data);
      trackQuestAction("create", data.title, data.durationDays);
      // Award "chose_quest" badge on first quest
      if (!hasBadge("chose_quest")) {
        awardBadge({ badgeKey: "chose_quest", triggerContext: { quest_title: data.title } });
      }
      // Complete onboarding if in simplified mode
      if (isSimplifiedMode) {
        completeOnboarding("quest");
      }
    },
    [createQuest, hasBadge, awardBadge, isSimplifiedMode, completeOnboarding, trackQuestAction],
  );

  // Handle quest update - award "respecd" badge
  const handleUpdateQuest = useCallback(
    (data: { questId: string; title: string }) => {
      updateQuest(data);
      trackQuestAction("update", data.title);
      // Award "respecd" badge for intentionally adjusting quest
      if (!hasBadge("respecd")) {
        awardBadge({ badgeKey: "respecd", triggerContext: { action: "quest_updated" } });
      }
    },
    [updateQuest, hasBadge, awardBadge, trackQuestAction],
  );

  // Handle promise resolution - award badge
  const handleResolvePromise = useCallback(
    (data: { promiseId: string; kept: boolean }) => {
      resolvePromise(data);
      trackPromiseAction(data.kept ? "kept" : "broken");
      // Award "kept_promise" badge on first kept promise
      if (data.kept && !hasBadge("kept_promise")) {
        awardBadge({ badgeKey: "kept_promise", triggerContext: { promise_id: data.promiseId } });
      }
    },
    [resolvePromise, hasBadge, awardBadge, trackPromiseAction],
  );

  // Handle time logging - check badge
  // Handle time logging - async to support UI feedback
  const handleLogTime = useCallback(
    async (data: { invested: number; wasted: number; notes?: string }) => {
      const result = await logTime(data);
      trackTimeLog(data.invested, data.wasted);
      // Check if protected_time badge should be awarded
      checkProtectedTimeBadge();
      // Dismiss welcome back banner on first action
      markFirstActionCompleted();
      return result;
    },
    [logTime, checkProtectedTimeBadge, trackTimeLog, markFirstActionCompleted],
  );

  // Handle XP earned with onboarding completion for "rep" action
  const handleXpEarnedWithOnboarding = useCallback(() => {
    handleXpEarned();
    // Complete onboarding if in simplified mode
    if (isSimplifiedMode) {
      completeOnboarding("rep");
    }
    // Dismiss welcome back banner on first action
    markFirstActionCompleted();
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding, markFirstActionCompleted]);

  // Handle operator interaction for onboarding
  const handleOperatorInteraction = useCallback(() => {
    handleXpEarned();
    trackGuideInteraction("message");
    // Complete onboarding if in simplified mode
    if (isSimplifiedMode) {
      completeOnboarding("operator");
    }
    // Dismiss welcome back banner on first action
    markFirstActionCompleted();
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding, trackGuideInteraction, markFirstActionCompleted]);

  // Handle tab changes with tracking
  const handleTabChange = useCallback((tab: TabType) => {
    trackTabChange(tab, activeTab);
    setPrevTab(activeTab);
    setActiveTab(tab);
  }, [activeTab, trackTabChange]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you tomorrow.",
    });
    navigate("/");
  };

  const quickStartEnabled = onboardingQuickStartEnabled();

  // Only block on critical auth loading - let other data load in background
  if (isAuthLoading) {
    return <SplashScreen />;
  }

  // Show onboarding flow for new users
  if (user?.id && needsOnboarding && currentOnboardingStep) {
    if (quickStartEnabled) {
      return (
        <OnboardingQuickStartFlow
          isPaid={isPaid}
          createQuest={createQuest}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
          }}
          onUpdateOnboarding={async (data) => {
            await updateOnboardingProgress(data);
          }}
        />
      );
    }

    return (
      <OnboardingFlow
        userId={user.id}
        initialStep={currentOnboardingStep}
        isPaid={isPaid}
        createQuest={createQuest}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
        }}
        onUpdateOnboarding={async (data) => {
          await updateOnboardingProgress(data);
        }}
      />
    );
  }

  // Show Welcome Back flow for returning users (3+ days since last action)
  if (showWelcomeBack) {
    return (
      <WelcomeBackScreen
        onContinue={dismissWelcomeBack}
        onViewHistory={() => {
          dismissWelcomeBack();
          setActiveTab("experience");
        }}
      />
    );
  }

  // Show Welcome Back follow-up (optional snapshot reset prompt)
  if (showFollowUp) {
    const currentJourney = activeSession?.journey_id 
      ? getJourneyById(activeSession.journey_id) 
      : null;
    
    return (
      <WelcomeBackFollowUp
        currentSnapshotTitle={currentJourney?.title}
        onKeepCurrent={dismissFollowUp}
        onChooseNew={() => {
          dismissFollowUp();
          if (canStartSnapshot) {
            setShowJourneySwitcher(true);
          } else {
            startCheckout(undefined, "welcome_back_follow_up");
          }
        }}
        isPaid={isPaid}
        nudgeEnabled={nudgeEnabled}
        onEnableDailyAlignment={handleEnableDailyAlignment}
      />
    );
  }


  const todayContent = activeSession && !isCompleted ? getDayContent(currentDay) : null;
  const todayAlreadyCompleted = completedDays.some((d) => d.day_number === currentDay);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - with safe area support for iOS PWA */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            {/* Manual refresh button - always visible on mobile for stuck states */}
            <Button
              variant="ghost"
              size="icon"
              onClick={triggerRefresh}
              disabled={isPullRefreshing}
              className="text-muted-foreground hover:text-foreground md:hidden"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isPullRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <a href="https://a.co/d/1DGPGEV" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Book className="w-4 h-4" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowProfileSettings(true)}
              className="text-muted-foreground hover:text-foreground"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-[calc(65px+env(safe-area-inset-top))] z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-md mx-auto px-6">
          <div className="flex gap-1 py-2">
            {[
              { id: "dashboard" as TabType, label: "Dashboard", icon: "🎮" },
              { id: "experience" as TabType, label: "Experience", icon: "✨" },
              { id: "guide" as TabType, label: "Guide", icon: "📖" },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.3)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with Pull-to-Refresh */}
      <main 
        ref={pullRefreshRef}
        className="flex-1 max-w-md mx-auto px-6 py-6 w-full overflow-y-auto relative"
      >
        {/* Pull-to-Refresh Indicator */}
        <PullToRefreshIndicator
          pullProgress={pullProgress}
          isRefreshing={isPullRefreshing}
          pullDistance={pullDistance}
        />
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Welcome Back Banner - shows on first day back */}
              {showReturnBanner && <WelcomeBackBanner />}

              {/* Daily Alignment Spotlight - one-time dismissible card */}
              {user?.id && !entitlementsLoading && (
                <DailyAlignmentSpotlight
                  userId={user.id}
                  isPaid={isPaid}
                  nudgeEnabled={nudgeEnabled}
                  onEnable={handleEnableDailyAlignment}
                  onUpgrade={() => startCheckout(undefined, "daily_alignment_spotlight")}
                  onDismiss={() => {}}
                />
              )}
              {/* Greeting Banner with streak/XP, mission, and snapshot focus */}
              <GreetingBanner
                userId={user?.id}
                totalXp={totalXp}
                streakDays={consecutiveStreak}
                visitCount={dashboardVisitCount}
                isPaid={isPaid || isTrialing}
                missionTitle={activeQuest?.title}
                onMissionClick={() => {
                  if (activeQuest) {
                    setEditingMissionTitle(activeQuest.title);
                    setShowMissionEdit(true);
                  }
                }}
                snapshotFocus={activeSession?.journey_id ? 
                  getJourneyById(activeSession.journey_id)?.title : undefined}
                snapshotEmoji={activeSession?.journey_id ? 
                  getJourneyById(activeSession.journey_id)?.emoji : undefined}
                onSnapshotClick={() => {
                  if (canStartSnapshot || !!activeSession) {
                    setShowJourneySwitcher(true);
                  } else {
                    startCheckout(undefined, "greeting_banner_snapshot");
                  }
                }}
              />

              {/* Main Mission Module - only show when NO active quest (to create one) */}
              {dashboardLoading ? (
                <MainQuestSkeleton />
              ) : !activeQuest && (
                <div data-testid="main-quest-module">
                  <MainQuestModule
                    activeQuest={activeQuest}
                    onCreateQuest={handleCreateQuest}
                    onUpdateQuest={handleUpdateQuest}
                    onCompleteQuest={completeQuest}
                    isCreating={isCreatingQuest}
                    isUpdating={isUpdatingQuest}
                    isCompleting={isCompletingQuest}
                    disabled={!isAuthReady}
                  />
                </div>
              )}

              {/* Snapshot Review Card - shows after any ended snapshot (completed or expired) */}
              {/* Show when: 
                  1. No active session but user has any completed/expired sessions, OR
                  2. Active session that is completed/expired 
              */}
              {(((hasEndedTrial && !isPaid) || (!activeSession && allSessions.some(s => s.status === "completed" || s.status === "expired" || s.status === "paused"))) ||
                (activeSession && (isCompleted || isExpired))) && 
               user?.id && !resetLoading && !dashboardLoading && (
                <SnapshotReviewCard
                  userId={user.id}
                  isPaid={isPaid}
                  onStartNewSnapshot={canStartSnapshot ? () => setShowJourneySwitcher(true) : undefined}
                  onUpgrade={() => startCheckout(undefined, "snapshot_review_card")}
                />
              )}

              {/* Today's Actions - Unified interactive checklist with 7-day foundation */}
              {(resetLoading || dashboardLoading) ? (
                <ResetProgressSkeleton />
              ) : (
                <TodayActions
                  userId={user?.id}
                  hasActiveSession={!!activeSession}
                  isResetCompleted={isCompleted}
                  isResetExpired={isExpired}
                  currentDay={currentDay}
                  todayResetCompleted={todayAlreadyCompleted}
                  completedDaysCount={completedDays.length}
                  onStartReset={() => acceptCovenant({ isPaid })}
                  isStartingReset={isAcceptingCovenant}
                  isPaid={isPaid}
                  hasUsedFreeReset={freeTrialUsed}
                  onUpgrade={() => startCheckout(undefined, "today_actions")}
                  hasActiveQuest={!!activeQuest}
                  todayTimeLogged={!!todayTimeLog}
                  pendingPromisesCount={pendingPromises.length}
                  todayPromiseMade={todayPromiseMade}
                   todayXpEarned={xpLogs
                    .filter((log) => new Date(log.created_at).toLocaleDateString("sv-SE") === todayLocal)
                    .reduce((sum, log) => sum + log.amount, 0)}
                  buildLastUpdatedAt={currentBuild?.updated_at ?? null}
                  journeyId={activeSession?.journey_id ?? undefined}
                  journeyTitle={activeSession?.journey_id ? 
                    getJourneyById(activeSession.journey_id)?.title : undefined}
                  onChangeJourney={() => setShowJourneySwitcher(true)}
                  missionTitle={activeQuest?.title}
                  onOpenTimeLog={() => {
                    // Ensure insights section is visible, then open dialog
                    if (!showInsights) {
                      setShowInsights(true);
                      // Wait for React to mount the component before opening
                      requestAnimationFrame(() => {
                        setTimeout(() => timeCurrencyRef.current?.openLogDialog(), 50);
                      });
                    } else {
                      timeCurrencyRef.current?.openLogDialog();
                    }
                  }}
                  onOpenPromises={() => {
                    // Ensure insights section is visible, then open dialog
                    if (!showInsights) {
                      setShowInsights(true);
                      // Wait for React to mount the component before opening
                      requestAnimationFrame(() => {
                        setTimeout(() => integrityRef.current?.openDetailDialog(), 50);
                      });
                    } else {
                      integrityRef.current?.openDetailDialog();
                    }
                  }}
                  onOpenAIGuide={() => {
                    trackGuideInteraction("open");
                    // Stay on dashboard tab and open The Controllables messenger
                    aiGuidePanelRef.current?.open();
                  }}
                  onOpenBuild={() => buildRef.current?.openDetailDialog()}
                  askGuideCompleted={askGuideCompletedToday}
                  onDay7AllComplete={triggerDay7Celebration}
                />
              )}

              {/* AI Morning Briefing Card */}
              {user?.id && !entitlementsLoading && !!activeSession && !isCompleted && !isExpired && (
                <DailyBriefingCard
                  isPaid={isPaid}
                  isTrialing={isTrialing}
                  hasActiveSnapshot={!!activeSession && !isCompleted && !isExpired}
                  onUpgrade={() => startCheckout(undefined, "daily_briefing")}
                />
              )}

              {/* Brain & Body Health Tracker */}
              {user?.id && (
                <BrainBodyTracker
                  userId={user.id}
                  streak={wellnessStreak}
                  onLogWellness={() => {
                    if (!showInsights) {
                      setShowInsights(true);
                    }
                  }}
                  onQuickLog={async (sleep, movement, nutrition) => {
                    const success = await logWellness(sleep, movement, nutrition);
                    if (success) {
                      queryClient.invalidateQueries({ queryKey: ["brain-body-wellness", user.id] });
                    }
                    return success;
                  }}
                  onImportHealth={() => {
                    if (!showInsights) {
                      setShowInsights(true);
                    }
                  }}
                />
              )}

              {/* Wellness Goals */}
              {user?.id && (
                <WellnessGoalsCard userId={user.id} />
              )}

              {/* Today's Plan */}
              {user?.id && (
                <PlannerCard userId={user.id} />
              )}

              {user?.id && !entitlementsLoading && (
                <MealPlanCard
                  userId={user.id}
                  isPaid={isPaid}
                  onUpgrade={() => startCheckout(undefined, "meal_plan_card")}
                />
              )}


              {/* Controllable Levels Teaser - links to Guide tab */}
              {user?.id && (
                <ControllableLevelsTeaser
                  userId={user.id}
                  onNavigateToGuide={() => {
                    setActiveTab("guide");
                    trackEvent("navigation", "controllable_teaser_tap");
                  }}
                />
              )}

              {/* Build Entry Point - shows if user hasn't done assessment */}
              <BuildEntryPoint userId={user?.id} />

              {/* Daily Alignment promo for free users */}
              {!isPaid && !entitlementsLoading && showDashboardPaywallPromo && (
                <DailyAlignmentPromo onUpgrade={() => startCheckout(undefined, "daily_alignment_promo_dashboard")} />
              )}

              {/* Season Banner - shown when user has an active season */}
              {activeSeason && seasonProgress && (
                <SeasonBanner
                  seasonName={activeSeason.name}
                  snapshots={seasonSnapshots}
                  progress={seasonProgress}
                />
              )}

              {/* 7-Day Foundation Progress - only show when active session */}
              {activeSession && !isCompleted && !isExpired && (
                <ResetProgressModule
                  hasActiveSession={!!activeSession}
                  isCompleted={isCompleted}
                  isExpired={isExpired}
                  currentDay={currentDay}
                  completedDays={completedDays}
                  todayAlreadyCompleted={todayAlreadyCompleted}
                  
                  onStartReset={(isPaidArg) => acceptCovenant({ isPaid: isPaidArg })}
                  isStartingReset={isAcceptingCovenant}
                  isPaid={isPaid}
                  totalSessionCount={allSessions.length}
                  onUpgrade={() => startCheckout(undefined, "reset_progress_module")}
                  currentJourneyId={activeSession?.journey_id}
                  onSwitchJourney={() => setShowJourneySwitcher(true)}
                  lastCompletedAt={
                    allSessions.find((s) => s.status === "completed")?.completed_at
                  }
                />
              )}

              {/* Snapshot Circle */}
              {activeSession && !isCompleted && !isExpired && user?.id && (
                <CircleCard
                  myCircle={myCircle ?? null}
                  circleMembers={circleMembers}
                  showedUpTodayCount={showedUpTodayCount}
                  currentDay={currentDay}
                  displayName={circleDisplayName}
                  currentJourneyId={activeSession.journey_id}
                  isCreatingCircle={isCreatingCircle}
                  isLeavingCircle={isLeavingCircle}
                  onCreateCircle={createCircle}
                  onLeaveCircle={leaveCircle}
                  onJoinCircle={joinCircle}
                  isJoiningCircle={isJoiningCircle}
                  lookupCircle={lookupCircle}
                  joinDialogOpen={joinDialogOpen}
                  onJoinDialogOpenChange={(open) => {
                    setJoinDialogOpen(open);
                    if (!open && joinCodeFromUrl) {
                      searchParams.delete("join");
                      setSearchParams(searchParams, { replace: true });
                    }
                  }}
                  initialJoinCode={joinCodeFromUrl || undefined}
                  currentUserId={user.id}
                  streakLeaderboard={streakLeaderboard}
                />
              )}

              {/* Snapshot Selector Dialog - triggered from within Reset module */}
              {activeSession && !isCompleted && user?.id && (
                <SnapshotSelector
                  currentSnapshotId={activeSession.journey_id}
                  sessionId={activeSession.id}
                  currentDay={currentDay}
                  userId={user.id}
                  isPaid={isPaid}
                  hasUsedFreeTrial={freeTrialUsed}
                  onUpgrade={() => startCheckout(undefined, "snapshot_selector")}
                  onSnapshotChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
                    queryClient.invalidateQueries({ queryKey: ["reset-session"], exact: false });
                    setShowJourneySwitcher(false);
                  }}
                  isOpen={showJourneySwitcher}
                  onOpenChange={setShowJourneySwitcher}
                />
              )}

              {/* Start New Snapshot Dialog - shows when no active session */}
              {!activeSession && user?.id && canStartSnapshot && (
                <StartSnapshotDialog
                  isOpen={showJourneySwitcher}
                  onOpenChange={setShowJourneySwitcher}
                  onSelectSnapshot={async (snapshotId, asSeason) => {
                    if (asSeason) {
                      const seasonId = await startSeason();
                      if (seasonId) {
                        // Start the snapshot, then link it to the season after creation
                        acceptCovenant({ isPaid, journeyId: snapshotId });
                        // We'll link once the session is created - use a brief timeout
                        setTimeout(async () => {
                          const { data: newSession } = await supabase
                            .from("reset_sessions")
                            .select("id")
                            .eq("user_id", user!.id)
                            .eq("status", "active")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                          if (newSession) {
                            await linkSnapshotToSeason(newSession.id, seasonId);
                          }
                        }, 2000);
                      }
                    } else {
                      // If user has an active season, auto-link
                      acceptCovenant({ isPaid, journeyId: snapshotId });
                      if (activeSeason) {
                        setTimeout(async () => {
                          const { data: newSession } = await supabase
                            .from("reset_sessions")
                            .select("id")
                            .eq("user_id", user!.id)
                            .eq("status", "active")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                          if (newSession) {
                            await linkSnapshotToSeason(newSession.id, activeSeason.id);
                          }
                        }, 2000);
                      }
                    }
                    setShowJourneySwitcher(false);
                  }}
                  isStarting={isAcceptingCovenant}
                  isPaid={isPaid}
                />
              )}

              {/* Progressive disclosure divider - collapsible analytics section */}
              {!isSimplifiedMode && (
                <Collapsible open={showInsights} onOpenChange={setShowInsights}>
                  <CollapsibleTrigger asChild>
                    <button className="mt-6 mb-3 w-full flex items-center justify-between group">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        When you want more insight
                      </p>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showInsights ? "rotate-180" : ""}`} />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {/* Section Label */}
                      <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                        Your Current State
                      </p>

                      {/* 2x2 Grid - compact state indicators */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Top-left: Your Build */}
                        {buildLoading ? (
                          <SmallModuleSkeleton />
                        ) : (
                          <div data-testid="build-overview-module">
                            <BuildOverviewModule compact ref={buildRef} />
                          </div>
                        )}

                        {/* Top-right: Momentum */}
                        {dashboardLoading ? (
                          <SmallModuleSkeleton />
                        ) : (
                          <div data-testid="xp-momentum-module">
                            <XpMomentumModule totalXp={totalXp} recentLogs={xpLogs} compact />
                          </div>
                        )}

                        {/* Bottom-left: Time Currency */}
                        {dashboardLoading ? (
                          <SmallModuleSkeleton />
                        ) : (
                          <div data-testid="time-currency-module">
                            <TimeCurrencyModule
                              ref={timeCurrencyRef}
                              todayTimeLog={todayTimeLog}
                              onLogTime={handleLogTime}
                              isLogging={isLoggingTime}
                              compact
                              disabled={!isAuthReady}
                            />
                          </div>
                        )}

                        {/* Bottom-right: Integrity */}
                        {dashboardLoading ? (
                          <SmallModuleSkeleton />
                        ) : (
                          <div data-testid="integrity-meter-module">
                            <IntegrityMeterModule
                              ref={integrityRef}
                              integrityScore={integrityScore}
                              pendingPromises={pendingPromises}
                              hasAnyPromises={integrityLogs.length > 0}
                              todayPromiseMade={todayPromiseMade}
                              onCreatePromise={createPromise}
                              onResolvePromise={handleResolvePromise}
                              compact
                              disabled={!isAuthReady}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Simplified mode: Show only Build & Momentum until first action */}
              {isSimplifiedMode && (
                <div className="space-y-2">
                  {/* Section Label */}
                  <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                    Your Current State
                  </p>

                  {/* 2x1 Grid - only Build & Momentum during onboarding */}
                  <div className="grid grid-cols-2 gap-2">
                    {buildLoading ? (
                      <SmallModuleSkeleton />
                    ) : (
                      <div data-testid="build-overview-module">
                        <BuildOverviewModule compact />
                      </div>
                    )}

                    {dashboardLoading ? (
                      <SmallModuleSkeleton />
                    ) : (
                      <div data-testid="xp-momentum-module">
                        <XpMomentumModule totalXp={totalXp} recentLogs={xpLogs} compact />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* The Controllables - Lazy loaded, Locked for free users */}
              {entitlementsLoading ? (
                <AIGuideSkeleton />
              ) : (
                <div data-testid="ai-guide-panel">
                  <LazyAIGuidePanelWrapper
                    ref={aiGuidePanelRef}
                    activeQuest={activeQuest}
                    totalXp={totalXp}
                    integrityScore={integrityScore}
                    currentBuild={currentBuild}
                    onXpEarned={handleOperatorInteraction}
                    isPaid={isPaid}
                    isTrialing={isTrialing}
                    onUpgrade={() => startCheckout(undefined, "ai_guide_panel")}
                    isCheckingOut={isCheckingOut}
                    hasActiveSnapshot={!!activeSession && !isCompleted}
                    onMessageSent={handleAskGuideMessageSent}
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "guide" && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold text-foreground mb-2">The Controllables</h1>
                <p className="text-muted-foreground text-sm">Play your life on purpose.</p>
              </div>

              {/* Controllable Levels - Pokemon-style progression */}
              {user?.id && (
                <ControllableLevelsCard userId={user.id} />
              )}

              {/* Game Rules and Manual */}
              <GameRulesSection />
              <DashboardManualSection />

              {/* Book promo */}
              <motion.a
                href="https://a.co/d/1DGPGEV"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="block mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-center"
              >
                <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-display font-semibold text-foreground mb-2">Read the Full Book</h3>
                <p className="text-sm text-muted-foreground mb-4">Dive deeper into The Controllables on Amazon</p>
                <Button variant="outline" size="sm">
                  Get the Book →
                </Button>
              </motion.a>
            </motion.div>
          )}

          {activeTab === "experience" && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Header with framing line */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h1 className="font-display text-2xl font-semibold text-foreground">Experience</h1>
                </div>
                <p className="text-muted-foreground text-sm">This is where effort turns into evidence.</p>
              </div>

              {/* ===== FREE CONTENT FIRST ===== */}

              {/* Time Cycles - FREE for all users */}
              <TimeCycleCard
                activeQuest={activeQuest}
                currentResetDay={currentDay}
                hasActiveReset={!!activeSession && !isCompleted}
                currentBuild={currentBuild}
              />

              {/* Insights at a Glance - Paid only */}
              {!isSimplifiedMode && isPaid && user?.id && (
                <SuspenseExperienceComponent>
                  <LazyInsightsAtAGlance userId={user.id} consecutiveStreak={consecutiveStreak} />
                </SuspenseExperienceComponent>
              )}

              {/* Wellness Streak Heatmap - Paid only */}
              {!isSimplifiedMode && isPaid && wellnessLogs.length > 0 && (
                <WellnessStreakHistory recentLogs={wellnessLogs} streak={wellnessStreak} />
              )}

              {/* Snapshot History - Visual Brick Stacking View */}
              {/* Show for ALL users who have completed their free trial (or paid users) */}
              {!isSimplifiedMode && user?.id && (isPaid || allSessions.some(s => s.status === "completed" || s.status === "expired")) && (
                <SuspenseExperienceComponent>
                  <LazySnapshotHistory
                    sessions={(isPaid ? allSessions : allSessions.filter((s) => s.status !== "active")).map((s) => ({
                      id: s.id,
                      snapshotId: s.journey_id,
                      startDate: s.start_date,
                      completedAt: s.completed_at,
                      status: s.status as "active" | "completed" | "expired" | "paused",
                      daysCompleted: allCompletedDays.filter((d) => d.session_id === s.id).length,
                      xpEarned: allCompletedDays.filter((d) => d.session_id === s.id).length * 25 + 
                        (s.status === "completed" ? 25 : 0), // Day 7 bonus
                    }))}
                    userId={user.id}
                    isPaid={isPaid}
                  />
                </SuspenseExperienceComponent>
              )}

              {/* ===== LOCKED CONTENT (Premium) - Show for free users without any completed/expired snapshots ===== */}
              {/* Free users who completed their trial already see their real snapshot history above */}
              {!isPaid && !isSimplifiedMode && !allSessions.some(s => s.status === "completed" || s.status === "expired") && (
                <div className={showOverlayPaywall ? "relative" : "space-y-3"}>
                  {/* Blurred preview of locked content */}
                  <div className="space-y-4 opacity-40 blur-[2px] pointer-events-none">
                    <SuspenseExperienceComponent>
                      <LazySnapshotHistory
                        sessions={allSessions.slice(0, 2).map((s) => ({
                          id: s.id,
                          snapshotId: s.journey_id,
                          startDate: s.start_date,
                          completedAt: s.completed_at,
                          status: s.status as "active" | "completed" | "expired" | "paused",
                          daysCompleted: allCompletedDays.filter((d) => d.session_id === s.id).length,
                          xpEarned: allCompletedDays.filter((d) => d.session_id === s.id).length * 25 + 
                            (s.status === "completed" ? 25 : 0),
                        }))}
                        userId={user?.id}
                        isPaid={false}
                      />
                    </SuspenseExperienceComponent>
                    <SuspenseExperienceComponent>
                      <LazyBadgesEarned earnedBadges={earnedBadges} isLoading={false} />
                    </SuspenseExperienceComponent>
                  </div>
                  {showOverlayPaywall ? (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={(plan) => startCheckout(plan, "experience_locked_overlay")}
                      isLoading={isCheckingOut}
                    />
                  ) : useInlinePaywall ? (
                    <DailyAlignmentPromo onUpgrade={() => startCheckout(undefined, "experience_inline_promo")} />
                  ) : null}
                </div>
              )}

              {/* Badges/Certificates lock overlay for free users who completed trial */}
              {!isPaid && !isSimplifiedMode && allSessions.some(s => s.status === "completed" || s.status === "expired") && (
                <div className={showOverlayPaywall ? "relative" : "space-y-3"}>
                  {/* Blurred preview of locked content */}
                  <div className="space-y-4 opacity-40 blur-[2px] pointer-events-none">
                    <SuspenseExperienceComponent>
                      <LazyBadgesEarned earnedBadges={earnedBadges} isLoading={false} />
                    </SuspenseExperienceComponent>
                  </div>
                  {showOverlayPaywall ? (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={(plan) => startCheckout(plan, "experience_locked_overlay_post_trial")}
                      isLoading={isCheckingOut}
                    />
                  ) : useInlinePaywall ? (
                    <DailyAlignmentPromo onUpgrade={() => startCheckout(undefined, "experience_inline_promo_post_trial")} />
                  ) : null}
                </div>
              )}

              {/* Badges Earned - Lazy loaded, for paid users */}
              {!isSimplifiedMode && isPaid && (
                <SuspenseExperienceComponent>
                  <LazyBadgesEarned earnedBadges={earnedBadges} isLoading={badgesLoading} />
                </SuspenseExperienceComponent>
              )}

              {/* Activity History - Lazy loaded, for paid users */}
              {!isSimplifiedMode && isPaid && (
                <SuspenseExperienceComponent>
                  <LazyActivityHistory
                    totalXp={totalXp}
                    xpLogs={xpLogs}
                    resetSessions={allSessions}
                    completedResetsCount={allSessions.filter((s) => s.status === "completed").length}
                  />
                </SuspenseExperienceComponent>
              )}

              {/* Certificates - Lazy loaded, for paid users */}
              {user?.id && isPaid && (
                <SuspenseExperienceComponent>
                  <LazyCertificates resetSessions={allSessions} userId={user.id} dailyResets={allCompletedDays} />
                </SuspenseExperienceComponent>
              )}


              {/* Journey Summary Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 text-center"
              >
                <p className="text-sm text-muted-foreground mb-2">"Control The Controllables"</p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div>
                    <span className="font-display font-bold text-lg text-accent">{allSessions.length}</span>
                    <span className="text-muted-foreground ml-1">Snapshots</span>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                    <span className="font-display font-bold text-lg text-accent">{allCompletedDays.length}</span>
                    <span className="text-muted-foreground ml-1">Days Checked In</span>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                    <span className="font-display font-bold text-lg text-accent">{totalXp.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">XP</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer with version on Guide tab and intentional usage microcopy after 5 visits */}
      <footer className="max-w-md mx-auto px-6 py-6 text-center space-y-1">
        {dashboardVisitCount > 5 && (
          <p className="text-xs text-muted-foreground/60">
            Quiet momentum. One check-in at a time.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Controllables
          {activeTab === "guide" && (
            <span className="ml-2 text-muted-foreground/50">v{APP_VERSION}</span>
          )}
        </p>
        {activeTab === "guide" && (
          <div className="mt-2">
            <WhatsNewTrigger />
          </div>
        )}
      </footer>

      {/* PWA Install Nudge */}
      <InstallNudge
        show={showInstallNudge}
        isIOS={isIOSDevice}
        onInstall={handleInstall}
        onDismiss={handleInstallDismiss}
      />

      {/* App Update Prompt for PWA users */}
      <UpdatePrompt />

      {/* What's New Modal - shows once per version upgrade */}
      <WhatsNewModal />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        open={showProfileSettings}
        onOpenChange={setShowProfileSettings}
        userId={user?.id ?? ""}
        userEmail={user?.email ?? ""}
        isPaid={isPaid}
        onSignOut={handleSignOut}
      />

      {/* Mission Edit Modal - Direction, not a task */}
      <Dialog open={showMissionEdit} onOpenChange={setShowMissionEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Set Your Direction
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              This can evolve. You're just choosing where to point right now.
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Direction, not a task.
              </p>
              <Input
                value={editingMissionTitle}
                onChange={(e) => setEditingMissionTitle(e.target.value)}
                placeholder="e.g., Reclaim Energy, Build Discipline"
                className="text-base"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (activeQuest && editingMissionTitle.trim()) {
                  handleUpdateQuest({ questId: activeQuest.id, title: editingMissionTitle.trim() });
                  setShowMissionEdit(false);
                }
              }}
              disabled={!editingMissionTitle.trim() || isUpdatingQuest}
            >
              {isUpdatingQuest ? "Updating..." : "Update Direction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Season Complete Overlay */}
      {showSeasonComplete && seasonProgress && (
        <SeasonComplete
          seasonName={activeSeason?.name}
          snapshots={seasonSnapshots}
          progress={seasonProgress}
          onStartNewSeason={async () => {
            setShowSeasonComplete(false);
            const newSeasonId = await startSeason();
            if (newSeasonId) {
              setShowJourneySwitcher(true);
            }
          }}
          onTakeBreak={() => {
            setShowSeasonComplete(false);
            navigate("/dashboard?maintenanceMode=true");
          }}
          onDismiss={() => setShowSeasonComplete(false)}
        />
      )}

      {/* Wellness Streak Celebration Overlay */}
      {hitMilestone && (
        <StreakCelebration
          milestone={hitMilestone}
          xpBonus={STREAK_MILESTONE_XP[hitMilestone] || 0}
          displayName={circleDisplayName}
          onDismiss={clearMilestone}
        />
      )}
    </div>
  );
}
