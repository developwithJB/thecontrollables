import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Book, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { supabase } from "@/integrations/supabase/client";
import { getDayContent, RESET_DAYS } from "@/lib/resetContent";
import { APP_VERSION } from "@/lib/version";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

// Dashboard modules
import { MainQuestModule } from "@/components/dashboard/MainQuestModule";
import { XpMomentumModule } from "@/components/dashboard/XpMomentumModule";
import { IntegrityMeterModule } from "@/components/dashboard/IntegrityMeterModule";
import { TimeCurrencyModule } from "@/components/dashboard/TimeCurrencyModule";
import { BuildOverviewModule } from "@/components/dashboard/BuildOverviewModule";
import { ResetProgressModule } from "@/components/dashboard/ResetProgressModule";
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
  LazyProgressHistory,
  LazyMomentumDecay,
  LazyBadgesEarned,
  LazyResetHistory,
  SuspenseExperienceComponent,
  ExperienceLoadingSkeleton,
} from "@/components/experience/LazyExperienceComponents";

// Experience tab components (lighter ones loaded normally)
import { TimeCycleCard } from "@/components/experience/TimeCycleCard";
import { OfflineTriggers } from "@/components/experience/OfflineTriggers";
import { LockedOverlay } from "@/components/experience/LockedOverlay";

type TabType = "dashboard" | "experience" | "guide";

export default function Dashboard() {
  usePageViewTracking("Dashboard");

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      // Award "chose_quest" badge on first quest
      if (!hasBadge("chose_quest")) {
        awardBadge({ badgeKey: "chose_quest", triggerContext: { quest_title: data.title } });
      }
      // Complete onboarding if in simplified mode
      if (isSimplifiedMode) {
        completeOnboarding("quest");
      }
    },
    [createQuest, hasBadge, awardBadge, isSimplifiedMode, completeOnboarding],
  );

  // Handle quest update - award "respecd" badge
  const handleUpdateQuest = useCallback(
    (data: { questId: string; title: string }) => {
      updateQuest(data);
      // Award "respecd" badge for intentionally adjusting quest
      if (!hasBadge("respecd")) {
        awardBadge({ badgeKey: "respecd", triggerContext: { action: "quest_updated" } });
      }
    },
    [updateQuest, hasBadge, awardBadge],
  );

  // Handle promise resolution - award badge
  const handleResolvePromise = useCallback(
    (data: { promiseId: string; kept: boolean }) => {
      resolvePromise(data);
      // Award "kept_promise" badge on first kept promise
      if (data.kept && !hasBadge("kept_promise")) {
        awardBadge({ badgeKey: "kept_promise", triggerContext: { promise_id: data.promiseId } });
      }
    },
    [resolvePromise, hasBadge, awardBadge],
  );

  // Handle time logging - check badge
  const handleLogTime = useCallback(
    (data: { invested: number; wasted: number; notes?: string }) => {
      logTime(data);
      // Check if protected_time badge should be awarded
      checkProtectedTimeBadge();
    },
    [logTime, checkProtectedTimeBadge],
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
    // Complete onboarding if in simplified mode
    if (isSimplifiedMode) {
      completeOnboarding("operator");
    }
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding]);

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
            <ThemeToggle />
            <a href="https://a.co/d/1DGPGEV" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Book className="w-4 h-4" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
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
                onClick={() => setActiveTab(tab.id)}
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

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto px-6 py-6 w-full">
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
              {/* Greeting */}
              <div className="mb-2">
                <h1 className="font-display text-2xl font-semibold text-foreground">{greeting()}</h1>
                <p className="text-sm text-muted-foreground">Your life dashboard</p>
              </div>

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
                  />
                </div>
              )}

              {/* Reset Progress Module */}
              {resetLoading ? (
                <ResetProgressSkeleton />
              ) : (
                <div data-testid="reset-progress-module">
                  <ResetProgressModule
                    hasActiveSession={!!activeSession}
                    isCompleted={isCompleted}
                    isExpired={isExpired}
                    currentDay={currentDay}
                    completedDays={completedDays}
                    todayAlreadyCompleted={todayAlreadyCompleted}
                    readings={readings}
                    onStartReset={acceptCovenant}
                    isStartingReset={isAcceptingCovenant}
                  />
                </div>
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
                        <BuildOverviewModule compact />
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
                          todayTimeLog={todayTimeLog}
                          onLogTime={handleLogTime}
                          isLogging={isLoggingTime}
                          compact
                        />
                      </div>
                    )}

                    {/* Bottom-right: Integrity */}
                    {dashboardLoading ? (
                      <SmallModuleSkeleton />
                    ) : (
                      <div data-testid="integrity-meter-module">
                        <IntegrityMeterModule
                          integrityScore={integrityScore}
                          pendingPromises={pendingPromises}
                          onCreatePromise={createPromise}
                          onResolvePromise={handleResolvePromise}
                          compact
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

              {/* Progress History - Lazy loaded, Locked for free users, hidden in simplified mode */}
              {!isSimplifiedMode && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyProgressHistory
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

              {/* Reset History with Certificates - Lazy loaded, Locked for free users */}
              {user?.id && (
                <div className="relative">
                  <SuspenseExperienceComponent>
                    <LazyResetHistory resetSessions={allSessions} userId={user.id} dailyResets={allCompletedDays} />
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

      {/* Footer with version on Guide tab */}
      <footer className="max-w-md mx-auto px-6 py-6 text-center">
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
    </div>
  );
}
