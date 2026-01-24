import { useEffect, useCallback, useMemo, lazy, Suspense, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { Book, BookOpen, Sparkles, RefreshCw, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useDailyReadings } from "@/hooks/useDailyReadings";
import { useBadges } from "@/hooks/useBadges";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useActionTracking } from "@/hooks/useActionTracking";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
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
import { JourneySwitcher } from "@/components/dashboard/JourneySwitcher";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
// DailyCheckinCard removed - functionality merged into TodayActions
import { TodayActions } from "@/components/dashboard/TodayActions";
// JourneyChangesLog removed - consolidated into Activity History
import { ReadingCard } from "@/components/ReadingCard";
import { GameRulesSection } from "@/components/GameRulesSection";
import { DashboardManualSection } from "@/components/DashboardManualSection";
import { InstallNudge } from "@/components/pwa/InstallNudge";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import {
  MainQuestSkeleton,
  ResetProgressSkeleton,
  SmallModuleSkeleton,
  AIGuideSkeleton,
} from "@/components/dashboard/DashboardSkeletons";

// Lazy load heavy components
import { LazyAIGuidePanelWrapper } from "@/components/dashboard/LazyAIGuidePanel";
import {
  LazyActivityHistory,
  LazyMomentumDecay,
  LazyBadgesEarned,
  LazyCertificates,
  SuspenseExperienceComponent,
  ExperienceLoadingSkeleton,
} from "@/components/experience/LazyExperienceComponents";

// Experience tab components (lighter ones loaded normally)
import { TimeCycleCard } from "@/components/experience/TimeCycleCard";
import { OfflineTriggers } from "@/components/experience/OfflineTriggers";
import { LockedOverlay } from "@/components/experience/LockedOverlay";
import { PullToRefreshIndicator } from "@/components/pwa/PullToRefreshIndicator";
import { OnboardingFlow } from "@/components/onboarding";

type TabType = "dashboard" | "experience" | "guide";

export default function Dashboard() {
  usePageViewTracking("Dashboard");

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [prevTab, setPrevTab] = useState<TabType | null>(null);
  const [showJourneySwitcher, setShowJourneySwitcher] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  // Refs for imperative dialog triggers
  const timeCurrencyRef = useRef<TimeCurrencyModuleHandle>(null);
  const integrityRef = useRef<IntegrityMeterModuleHandle>(null);
  const buildRef = useRef<BuildOverviewModuleHandle>(null);
  
  // Track dashboard visits for conditional microcopy placement
  const dashboardVisitCount = useDashboardVisitCount();

  const { toast } = useToast();
  const navigate = useNavigate();
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
  } = useReset();

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
    pendingPromises,
    createPromise,
    resolvePromise,
    todayTimeLog,
    logTime,
    isLoggingTime,
  } = useDashboardSummary();

  // Daily readings from database
  const { readings, isLoading: readingsLoading } = useDailyReadings();

  // Build data for AI Guide
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

  // Fetch all reset sessions for history
  const { data: allSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["all-reset-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch completed days per session for history
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
    enabled: !!user?.id,
  });

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(session?.user ?? null);
          if (!session) {
            navigate("/auth");
          }
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (isMounted) {
          setIsAuthLoading(false);
          navigate("/auth");
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
        setIsAuthLoading(false);
      }
    });

    // Safety timeout - never get stuck loading
    const timeout = setTimeout(() => {
      if (isMounted && isAuthLoading) {
        console.warn("Auth loading timeout - forcing completion");
        setIsAuthLoading(false);
      }
    }, 5000);

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
  const handleLogTime = useCallback(
    (data: { invested: number; wasted: number; notes?: string }) => {
      logTime(data);
      trackTimeLog(data.invested, data.wasted);
      // Check if protected_time badge should be awarded
      checkProtectedTimeBadge();
    },
    [logTime, checkProtectedTimeBadge, trackTimeLog],
  );

  // Handle XP earned with onboarding completion for "rep" action
  const handleXpEarnedWithOnboarding = useCallback(() => {
    handleXpEarned();
    // Complete onboarding if in simplified mode
    if (isSimplifiedMode) {
      completeOnboarding("rep");
    }
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding]);

  // Handle operator interaction for onboarding
  const handleOperatorInteraction = useCallback(() => {
    handleXpEarned();
    trackGuideInteraction("message");
    // Complete onboarding if in simplified mode
    if (isSimplifiedMode) {
      completeOnboarding("operator");
    }
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding, trackGuideInteraction]);

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

  // Only block on critical auth loading - let other data load in background
  if (isAuthLoading) {
    return <SplashScreen />;
  }

  // Show onboarding flow for new users
  if (user?.id && needsOnboarding && currentOnboardingStep) {
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning.";
    if (hour < 18) return "Good afternoon.";
    return "Good evening.";
  };

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
              <UserIcon className="w-4 h-4" />
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
                    ? "bg-accent text-accent-foreground shadow-[0_0_12px_rgba(102,189,239,0.3)]"
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
              {/* Greeting Banner with streak/XP and user name */}
              <GreetingBanner
                userId={user?.id}
                totalXp={totalXp}
                streakDays={completedDays.length}
                visitCount={dashboardVisitCount}
              />

              {/* Today's Actions - Unified interactive checklist with 7-day reset */}
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
                  readings={readings}
                  completedDaysCount={completedDays.length}
                  onStartReset={() => acceptCovenant({ isPaid })}
                  isStartingReset={isAcceptingCovenant}
                  isPaid={isPaid}
                  hasUsedFreeReset={!isPaid && allSessions.length >= 1}
                  onUpgrade={initiateCheckout}
                  hasActiveQuest={!!activeQuest}
                  todayTimeLogged={!!todayTimeLog}
                  pendingPromisesCount={pendingPromises.length}
                  todayXpEarned={xpLogs
                    .filter((log) => log.created_at.startsWith(new Date().toISOString().split("T")[0]))
                    .reduce((sum, log) => sum + log.amount, 0)}
                  buildLastUpdatedAt={currentBuild?.updated_at ?? null}
                  journeyTitle={activeSession?.journey_id ? 
                    getJourneyById(activeSession.journey_id)?.title : undefined}
                  onChangeJourney={() => setShowJourneySwitcher(true)}
                  onOpenTimeLog={() => timeCurrencyRef.current?.openLogDialog()}
                  onOpenPromises={() => integrityRef.current?.openDetailDialog()}
                  onOpenAIGuide={() => {
                    trackTabChange("guide");
                    setActiveTab("guide");
                  }}
                  onOpenBuild={() => buildRef.current?.openDetailDialog()}
                />
              )}

              {/* Build Entry Point - shows if user hasn't done assessment */}
              <BuildEntryPoint />

              {/* Main Quest Module */}
              {dashboardLoading ? (
                <MainQuestSkeleton />
              ) : (
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

              {/* Journey Focus Display - only show when active session */}
              {activeSession && !isCompleted && !isExpired && (
                <ResetProgressModule
                  hasActiveSession={!!activeSession}
                  isCompleted={isCompleted}
                  isExpired={isExpired}
                  currentDay={currentDay}
                  completedDays={completedDays}
                  todayAlreadyCompleted={todayAlreadyCompleted}
                  readings={readings}
                  onStartReset={(isPaidArg) => acceptCovenant({ isPaid: isPaidArg })}
                  isStartingReset={isAcceptingCovenant}
                  isPaid={isPaid}
                  totalSessionCount={allSessions.length}
                  onUpgrade={initiateCheckout}
                  currentJourneyId={activeSession?.journey_id}
                  onSwitchJourney={() => setShowJourneySwitcher(true)}
                  lastCompletedAt={
                    allSessions.find((s) => s.status === "completed")?.completed_at
                  }
                />
              )}

              {/* Journey Switcher Dialog - triggered from within Reset module */}
              {activeSession && !isCompleted && user?.id && (
                <JourneySwitcher
                  currentJourneyControllable={journeyControllable}
                  sessionId={activeSession.id}
                  currentDay={currentDay}
                  userId={user.id}
                  currentQuestTitle={activeQuest?.title}
                  onJourneyChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
                    setShowJourneySwitcher(false);
                  }}
                  onUpdateQuestTitle={(title) => {
                    if (activeQuest?.id) {
                      updateQuest({ questId: activeQuest.id, title });
                    }
                  }}
                  isOpen={showJourneySwitcher}
                  onOpenChange={setShowJourneySwitcher}
                />
              )}

              {/* Your Current State - Compact 2x2 grid of state indicators */}
              {!isSimplifiedMode && (
                <div className="space-y-2">
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
                          onCreatePromise={createPromise}
                          onResolvePromise={handleResolvePromise}
                          compact
                          disabled={!isAuthReady}
                        />
                      </div>
                    )}
                  </div>
                </div>
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

              {/* AI Guide - Lazy loaded, Locked for free users */}
              {entitlementsLoading ? (
                <AIGuideSkeleton />
              ) : (
                <div data-testid="ai-guide-panel">
                  <LazyAIGuidePanelWrapper
                    activeQuest={activeQuest}
                    totalXp={totalXp}
                    integrityScore={integrityScore}
                    currentBuild={currentBuild}
                    onXpEarned={handleOperatorInteraction}
                    isPaid={isPaid}
                    onUpgrade={initiateCheckout}
                    isCheckingOut={isCheckingOut}
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

              {/* Conditional ordering based on active reset */}
              {activeSession && !isCompleted ? (
                <>
                  {/* When reset IS ACTIVE: Daily Readings first */}
                  {/* Current Focus label */}
                  <p className="text-xs font-medium text-muted-foreground/70 tracking-wide uppercase mb-3">
                    Current Focus
                  </p>

                  {/* Section Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">Daily Readings</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-4 mb-8">
                    {readings.length > 0
                      ? readings.map((reading) => {
                          const completedDay = completedDays.find((d) => d.day_number === reading.day_number);
                          const isUnlocked = !!completedDay;
                          return (
                            <ReadingCard
                              key={reading.id}
                              day={reading.day_number}
                              emoji={reading.emoji}
                              controllable={reading.controllable}
                              chapter={reading.reading_chapter}
                              text={reading.reading_text}
                              isCompleted={isUnlocked}
                              completedAt={completedDay?.completed_at}
                              isLocked={!isUnlocked}
                              completedDayData={
                                completedDay
                                  ? {
                                      day_number: completedDay.day_number,
                                      reflection: completedDay.reflection,
                                      completed_at: completedDay.completed_at,
                                    }
                                  : undefined
                              }
                              totalCompletedDays={completedDays.length}
                            />
                          );
                        })
                      : RESET_DAYS.map((day) => {
                          const completedDay = completedDays.find((d) => d.day_number === day.day);
                          const isUnlocked = !!completedDay;
                          return (
                            <ReadingCard
                              key={day.day}
                              day={day.day}
                              emoji={day.emoji}
                              controllable={day.controllable}
                              chapter={day.reading.chapter}
                              text={day.reading.text}
                              isCompleted={isUnlocked}
                              completedAt={completedDay?.completed_at}
                              isLocked={!isUnlocked}
                              completedDayData={
                                completedDay
                                  ? {
                                      day_number: completedDay.day_number,
                                      reflection: completedDay.reflection,
                                      completed_at: completedDay.completed_at,
                                    }
                                  : undefined
                              }
                              totalCompletedDays={completedDays.length}
                            />
                          );
                        })}
                  </div>

                  {/* Rules of the Game second when reset active */}
                  <GameRulesSection />

                  {/* Dashboard Manual */}
                  <DashboardManualSection />
                </>
              ) : (
                <>
                  {/* When NO reset active: Rules of the Game first */}
                  <GameRulesSection />

                  {/* Dashboard Manual */}
                  <DashboardManualSection />

                  {/* Section Divider */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">Daily Readings</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-4">
                    {readings.length > 0
                      ? readings.map((reading) => {
                          const completedDay = completedDays.find((d) => d.day_number === reading.day_number);
                          const isUnlocked = !!completedDay;
                          return (
                            <ReadingCard
                              key={reading.id}
                              day={reading.day_number}
                              emoji={reading.emoji}
                              controllable={reading.controllable}
                              chapter={reading.reading_chapter}
                              text={reading.reading_text}
                              isCompleted={isUnlocked}
                              completedAt={completedDay?.completed_at}
                              isLocked={!isUnlocked}
                              completedDayData={
                                completedDay
                                  ? {
                                      day_number: completedDay.day_number,
                                      reflection: completedDay.reflection,
                                      completed_at: completedDay.completed_at,
                                    }
                                  : undefined
                              }
                              totalCompletedDays={completedDays.length}
                            />
                          );
                        })
                      : RESET_DAYS.map((day) => {
                          const completedDay = completedDays.find((d) => d.day_number === day.day);
                          const isUnlocked = !!completedDay;
                          return (
                            <ReadingCard
                              key={day.day}
                              day={day.day}
                              emoji={day.emoji}
                              controllable={day.controllable}
                              chapter={day.reading.chapter}
                              text={day.reading.text}
                              isCompleted={isUnlocked}
                              completedAt={completedDay?.completed_at}
                              isLocked={!isUnlocked}
                              completedDayData={
                                completedDay
                                  ? {
                                      day_number: completedDay.day_number,
                                      reflection: completedDay.reflection,
                                      completed_at: completedDay.completed_at,
                                    }
                                  : undefined
                              }
                              totalCompletedDays={completedDays.length}
                            />
                          );
                        })}
                  </div>
                </>
              )}

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
              />

              {/* Offline Triggers - FREE for all users */}
              <OfflineTriggers
                activeQuest={activeQuest}
                currentResetDay={currentDay}
                todayReading={readings.find((r) => r.day_number === currentDay) || null}
              />

              {/* ===== LOCKED CONTENT (Premium) ===== */}

              {/* Badges Earned - Lazy loaded, Locked for free users, hidden in simplified mode */}
              {!isSimplifiedMode && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyBadgesEarned earnedBadges={earnedBadges} isLoading={badgesLoading} />
                  </SuspenseExperienceComponent>
                  {!isPaid && (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={initiateCheckout}
                      isLoading={isCheckingOut}
                    />
                  )}
                </div>
              )}

              {/* Activity History - Lazy loaded, Locked for free users, hidden in simplified mode */}
              {!isSimplifiedMode && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyActivityHistory
                      totalXp={totalXp}
                      xpLogs={xpLogs}
                      resetSessions={allSessions}
                      completedResetsCount={allSessions.filter((s) => s.status === "completed").length}
                    />
                  </SuspenseExperienceComponent>
                  {!isPaid && (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={initiateCheckout}
                      isLoading={isCheckingOut}
                    />
                  )}
                </div>
              )}

              {/* Certificates - Lazy loaded, Locked for free users */}
              {user?.id && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyCertificates resetSessions={allSessions} userId={user.id} dailyResets={allCompletedDays} />
                  </SuspenseExperienceComponent>
                  {!isPaid && allSessions.filter((s) => s.status === "completed").length > 0 && (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={initiateCheckout}
                      isLoading={isCheckingOut}
                    />
                  )}
                </div>
              )}

              {/* Momentum Decay - Lazy loaded, Locked for free users, hidden in simplified mode */}
              {!isSimplifiedMode && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyMomentumDecay
                      lastActivity={(() => {
                        // Get the most recent activity from multiple sources
                        const dates: Date[] = [];
                        if (xpLogs[0]?.created_at) dates.push(new Date(xpLogs[0].created_at));
                        const latestSession = allSessions[0];
                        if (latestSession?.completed_at) dates.push(new Date(latestSession.completed_at));
                        if (latestSession?.created_at) dates.push(new Date(latestSession.created_at));
                        const latestCompletedDay = completedDays[0];
                        if (latestCompletedDay?.completed_at) dates.push(new Date(latestCompletedDay.completed_at));
                        if (dates.length === 0) return null;
                        return dates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString();
                      })()}
                      currentStreak={completedDays.length}
                      hasActiveQuest={!!activeQuest}
                      hasActiveReset={!!activeSession && !isCompleted}
                      onStartReset={() => navigate("/reset")}
                    />
                  </SuspenseExperienceComponent>
                  {!isPaid && (
                    <LockedOverlay
                      variant="experience-history"
                      onUpgrade={initiateCheckout}
                      isLoading={isCheckingOut}
                    />
                  )}
                </div>
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
                    <span className="text-muted-foreground ml-1">Resets</span>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                    <span className="font-display font-bold text-lg text-accent">{allCompletedDays.length}</span>
                    <span className="text-muted-foreground ml-1">Days Logged</span>
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
            Designed for intentional check-ins. Desktop or mobile.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Controllables
          {activeTab === "guide" && (
            <span className="ml-2 text-muted-foreground/50">v{APP_VERSION}</span>
          )}
        </p>
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

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        open={showProfileSettings}
        onOpenChange={setShowProfileSettings}
        userId={user?.id ?? ""}
        userEmail={user?.email ?? ""}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
