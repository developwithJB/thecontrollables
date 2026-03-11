import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useWelcomeBack } from "@/hooks/useWelcomeBack";
import { WelcomeBackScreen, WelcomeBackFollowUp } from "@/components/welcome-back";
import { useBadges } from "@/hooks/useBadges";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useActionTracking } from "@/hooks/useActionTracking";
import { canStartNewSnapshot, hasUsedFreeTrial, isInActiveTrial } from "@/lib/entitlements";
import { getDefaultCheckoutPlan, onboardingQuickStartEnabled, shouldUseInlinePaywall } from "@/lib/featureFlags";
import { useDashboardVisitCount } from "@/hooks/useDashboardVisitCount";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyById } from "@/lib/guidedJourneys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useSeason } from "@/hooks/useSeason";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { useDailyRings } from "@/hooks/useDailyRings";
import { useHealthData } from "@/hooks/useHealthData";
import { useAutoWearableSync } from "@/hooks/useAutoWearableSync";
import { usePlannerItems, getWeekRange } from "@/hooks/usePlanner";
import { PlanVsActualView } from "@/components/planner/PlanVsActualView";
import { useDailySynthesis } from "@/hooks/useDailySynthesis";
import { analyzeCalendar } from "@/lib/calendarIntelligence";
import { getFuelIntelligence } from "@/lib/fuelIntelligence";
import { useMealTracking } from "@/hooks/useMealTracking";

// Dashboard modules
import { SnapshotSelector } from "@/components/dashboard/SnapshotSelector";
import { StartSnapshotDialog } from "@/components/dashboard/StartSnapshotDialog";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
import { TodayActions } from "@/components/dashboard/TodayActions";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { AskDashboardBar } from "@/components/dashboard/AskDashboardBar";
import { ForecastCard } from "@/components/dashboard/ForecastCard";
import { SeasonComplete } from "@/components/SeasonComplete";
import { CompactRingsRow } from "@/components/dashboard/CompactRingsRow";
import { TodayReadinessBar } from "@/components/dashboard/TodayReadinessBar";
import { FuelTodayCard } from "@/components/dashboard/FuelTodayCard";
import {
  ResetProgressSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import { OnboardingFlow, OnboardingQuickStartFlow } from "@/components/onboarding";
import { ConfirmLastNightDialog } from "@/components/dashboard/ConfirmLastNightDialog";
import { ValidatePlanDialog } from "@/components/dashboard/ValidatePlanDialog";
import { SeasonSetup } from "@/components/dashboard/SeasonSetup";
import { useProjects } from "@/hooks/useProjects";

export default function Home() {
  usePageViewTracking("Today");
  const { trackEvent } = useAnalytics();
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showJourneySwitcher, setShowJourneySwitcher] = useState(false);
  const [showMissionEdit, setShowMissionEdit] = useState(false);
  const [editingMissionTitle, setEditingMissionTitle] = useState("");
  const [showConfirmLastNight, setShowConfirmLastNight] = useState(false);
  const [showValidatePlan, setShowValidatePlan] = useState(false);
  const [validatePlanCompleted, setValidatePlanCompleted] = useState(false);

  // Check if plan was already validated today
  useEffect(() => {
    const key = `validate_plan_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
    try { setValidatePlanCompleted(localStorage.getItem(key) === "1"); } catch {}
  }, [user.id]);

  const dashboardVisitCount = useDashboardVisitCount();

  const {
    trackQuestAction,
    trackResetAction,
    trackTimeLog,
    trackPromiseAction,
    trackGuideInteraction,
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
  } = useReset(user.id);

  // Day 7 celebration
  const day7CelebrationSeenKey = useMemo(() => {
    if (!activeSession?.id) return null;
    return `day7_celebration_seen_${user.id}_${activeSession.id}`;
  }, [user.id, activeSession?.id]);

  const triggerDay7Celebration = useCallback(() => {
    if (day7CelebrationSeenKey) {
      let alreadySeen = false;
      try { alreadySeen = localStorage.getItem(day7CelebrationSeenKey) === "1"; } catch {}
      if (!alreadySeen) try { alreadySeen = sessionStorage.getItem(day7CelebrationSeenKey) === "1"; } catch {}
      if (alreadySeen) return;
      try { localStorage.setItem(day7CelebrationSeenKey, "1"); } catch { try { sessionStorage.setItem(day7CelebrationSeenKey, "1"); } catch {} }
    }
    navigate("/reset?day7complete=true", { replace: true });
  }, [day7CelebrationSeenKey, navigate]);

  // Dashboard summary
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
    todayPromiseMade,
    consecutiveStreak,
    createPromise,
    resolvePromise,
    todayTimeLog,
    logTime,
    isLoggingTime,
  } = useDashboardSummary(user.id);

  const { currentBuild, buildLoading } = useBuildAssessment();

  const {
    earnedBadges,
    awardBadge,
    checkReturnedBadge,
    checkProtectedTimeBadge,
    checkAskedGuidanceBadge,
    hasBadge,
  } = useBadges(user.id);

  const {
    isSimplifiedMode,
    isLoading: onboardingLoading,
    completeOnboarding,
    ensureOnboardingRecord,
    needsOnboarding,
    currentOnboardingStep,
    updateOnboardingProgress,
  } = useOnboarding(user.id);

  const { isPaid, isLoading: entitlementsLoading, initiateCheckout, isCheckingOut } = useEntitlements(user.id);

  const {
    activeSeason,
    isLoadingSeason,
    seasonSnapshots,
    seasonProgress,
    startSeason,
    linkSnapshotToSeason,
    completeSeason,
    closeSeason,
    shouldShowSeasonComplete,
  } = useSeason(user.id);

  const { createProject, activeProjects } = useProjects(user.id, activeSeason?.id);

  // Fetch season-range health data for season close screen
  const { data: seasonHealthData = [] } = useQuery({
    queryKey: ["season-health-data", activeSeason?.id, activeSeason?.started_at],
    queryFn: async () => {
      if (!activeSeason?.started_at || !user.id) return [];
      const startDate = activeSeason.started_at.split("T")[0];
      const endDate = (activeSeason.completed_at || new Date().toISOString()).split("T")[0];
      const { data, error } = await supabase
        .from("health_sync_data")
        .select("sync_date, recovery_score, hrv_ms, strain_score")
        .eq("user_id", user.id)
        .gte("sync_date", startDate)
        .lte("sync_date", endDate);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        sync_date: r.sync_date,
        recovery_score: r.recovery_score,
        hrv_ms: r.hrv_ms,
        strain_score: r.strain_score,
      }));
    },
    enabled: !!activeSeason?.id && !!user.id,
    staleTime: 5 * 60 * 1000,
  });

  const { rings, completedCount } = useDailyRings(user.id);
  const { data: intelligenceData } = useDashboardIntelligence(user.id, completedCount, rings);

  // Plan vs Actual data for dashboard
  const weekRange = useMemo(() => getWeekRange(new Date()), []);
  const { data: weekPlannerItems = [] } = usePlannerItems(weekRange.start, weekRange.end, user.id);
  const { trend: healthTrend, isConnected: wearableConnected, provider: wearableProvider, latest: healthLatest } = useHealthData(user.id);

  // Auto-sync wearable data on dashboard load (throttled to every 4 hours)
  useAutoWearableSync(user.id, wearableProvider, wearableConnected);

  // Check if Google Calendar is connected
  const { data: calendarConnected = false } = useQuery({
    queryKey: ["planner-connection-active", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("planner_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    staleTime: 60_000,
  });

  const pvaData = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return weekRange.days.map((date: Date) => {
      const key = format(date, "yyyy-MM-dd");
      const dayItems = weekPlannerItems.filter((i: any) => i.scheduled_date === key);
      const isPast = date < todayDate;
      const isTodayDate = format(date, "yyyy-MM-dd") === format(todayDate, "yyyy-MM-dd");
      const healthForDay = healthTrend.find(h => h.date === key) ?? null;
      return {
        date,
        items: dayItems.map((item: any) => {
          let status: "done" | "partial" | "missed" | "planned" = "planned";
          if (item.status === "done") status = "done";
          else if (item.status === "skipped") status = "partial";
          else if (isPast && !isTodayDate) status = "missed";
          return { id: item.id, title: item.title, status, type: item.item_type, project_id: item.project_id ?? null };
        }),
        health: healthForDay,
      };
    });
  }, [weekRange.days, weekPlannerItems, healthTrend]);

  const pvaSyntheses = useDailySynthesis(pvaData, activeProjects);

  // Calendar intelligence for today
  const todayStr = new Date().toLocaleDateString("sv-SE");
  const todayPlannerItems = useMemo(() => weekPlannerItems.filter((i: any) => i.scheduled_date === todayStr), [weekPlannerItems, todayStr]);
  const todayCalendarIntel = useMemo(() => analyzeCalendar(todayPlannerItems), [todayPlannerItems]);

  const [showSeasonComplete, setShowSeasonComplete] = useState(false);
  const [showSeasonSetup, setShowSeasonSetup] = useState(false);
  useEffect(() => {
    if (shouldShowSeasonComplete) { setShowSeasonComplete(true); completeSeason(); }
  }, [shouldShowSeasonComplete, completeSeason]);

  // Show season setup when no active season and user is onboarded
  useEffect(() => {
    if (!needsOnboarding && !onboardingLoading && !isLoadingSeason && !activeSeason && !resetLoading && !showSeasonComplete) {
      setShowSeasonSetup(true);
    }
  }, [needsOnboarding, onboardingLoading, isLoadingSeason, activeSeason, resetLoading, showSeasonComplete]);

  // Profile for nudge status
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-nudge-status", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("email_nudge_enabled, nudge_frequency").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  });
  const nudgeEnabled = userProfile?.email_nudge_enabled ?? false;

  const handleEnableDailyAlignment = useCallback(async () => {
    const { error } = await supabase.from("profiles").update({ email_nudge_enabled: true, nudge_frequency: "daily" }).eq("id", user.id);
    if (!error) {
      toast({ title: "Daily Alignment enabled", description: "Your first email arrives tomorrow morning." });
      trackEvent("feature_activation", "daily_alignment_enabled");
      refetchProfile();
    }
  }, [user.id, toast, trackEvent, refetchProfile]);

  const todayActionsCompleted = useMemo(() => !!todayTimeLog, [todayTimeLog]);

  const {
    showWelcomeBack,
    showFollowUp,
    showReturnBanner,
    dismissWelcomeBack,
    dismissFollowUp,
    markFirstActionCompleted,
  } = useWelcomeBack({
    userId: user.id,
    hasActiveSession: !!activeSession,
    activeSessionCreatedAt: activeSession?.created_at || null,
    todayActionsCompleted,
  });

  // All sessions
  const { data: allSessions = [] } = useQuery({
    queryKey: ["all-reset-sessions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reset_sessions").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  });

  const hasEndedTrial = useMemo(() => {
    if (isPaid) return false;
    return allSessions.some((s) => s.status === "completed" || s.status === "expired" || s.status === "paused");
  }, [allSessions, isPaid]);

  const freeTrialUsed = useMemo(() => hasUsedFreeTrial(isPaid, allSessions.length), [isPaid, allSessions.length]);
  const canStartSnapshot = useMemo(() => canStartNewSnapshot(isPaid, allSessions.length), [isPaid, allSessions.length]);
  const isTrialing = useMemo(() => isInActiveTrial(isPaid, !!activeSession, isCompleted, isExpired, allSessions.length), [isPaid, activeSession, isCompleted, isExpired, allSessions.length]);

  const defaultCheckoutPlan = getDefaultCheckoutPlan();
  const useInlinePaywall = shouldUseInlinePaywall();

  const startCheckout = useCallback(
    (plan?: Parameters<typeof initiateCheckout>[0], source = "home") => {
      void initiateCheckout(plan ?? defaultCheckoutPlan, { source });
    },
    [initiateCheckout, defaultCheckoutPlan],
  );

  // Initializers
  useEffect(() => { ensureOnboardingRecord(); checkReturnedBadge(); }, [user.id, ensureOnboardingRecord, checkReturnedBadge]);

  // Retention tracking
  useEffect(() => {
    if (dashboardLoading) return;
    const lastVisitKey = `last_dashboard_visit_${user.id}`;
    const todayStr = new Date().toLocaleDateString("sv-SE");
    try {
      const lastVisit = localStorage.getItem(lastVisitKey);
      if (lastVisit !== todayStr) {
        const daysSince = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000) : null;
        trackEvent("retention", "daily_return", { days_since_last_visit: daysSince, current_snapshot_day: activeSession ? currentDay : null, has_active_session: !!activeSession });
        localStorage.setItem(lastVisitKey, todayStr);
      }
    } catch {}
  }, [user.id, dashboardLoading, trackEvent, activeSession, currentDay]);

  // Handle wearable OAuth callback params (fallback if user lands here)
  useEffect(() => {
    const connected = searchParams.get("wearable_connected");
    const wError = searchParams.get("wearable_error");
    if (connected) {
      toast({ title: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, description: "Your wearable data will sync shortly." });
      queryClient.invalidateQueries({ queryKey: ["wearable-connections"] });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_connected");
      setSearchParams(next, { replace: true });
    } else if (wError) {
      toast({ title: "Connection failed", description: `Wearable connection error: ${wError.replace(/_/g, " ")}`, variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // Focus/Day7 params
  useEffect(() => {
    if (searchParams.get("openFocus") === "1" && activeSession) {
      setShowJourneySwitcher(true);
      const next = new URLSearchParams(searchParams); next.delete("openFocus"); setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, activeSession]);

  useEffect(() => {
    if (searchParams.get("day7reading") !== "done") return;
    const next = new URLSearchParams(searchParams); next.delete("day7reading"); setSearchParams(next, { replace: true });
    if (currentDay === 7) triggerDay7Celebration();
  }, [searchParams, currentDay, setSearchParams, triggerDay7Celebration]);

  // Quest handlers
  const handleCreateQuest = useCallback((data: { title: string; durationDays: number }) => {
    createQuest(data);
    trackQuestAction("create", data.title, data.durationDays);
    if (!hasBadge("chose_quest")) awardBadge({ badgeKey: "chose_quest", triggerContext: { quest_title: data.title } });
    if (isSimplifiedMode) completeOnboarding("quest");
  }, [createQuest, hasBadge, awardBadge, isSimplifiedMode, completeOnboarding, trackQuestAction]);

  const handleUpdateQuest = useCallback((data: { questId: string; title: string }) => {
    updateQuest(data);
    trackQuestAction("update", data.title);
    if (!hasBadge("respecd")) awardBadge({ badgeKey: "respecd", triggerContext: { action: "quest_updated" } });
  }, [updateQuest, hasBadge, awardBadge, trackQuestAction]);

  const handleResolvePromise = useCallback((data: { promiseId: string; kept: boolean }) => {
    resolvePromise(data);
    trackPromiseAction(data.kept ? "kept" : "broken");
    if (data.kept && !hasBadge("kept_promise")) awardBadge({ badgeKey: "kept_promise", triggerContext: { promise_id: data.promiseId } });
  }, [resolvePromise, hasBadge, awardBadge, trackPromiseAction]);

  const handleLogTime = useCallback(async (data: { invested: number; wasted: number; notes?: string }) => {
    const result = await logTime(data);
    trackTimeLog(data.invested, data.wasted);
    checkProtectedTimeBadge();
    markFirstActionCompleted();
    return result;
  }, [logTime, checkProtectedTimeBadge, trackTimeLog, markFirstActionCompleted]);

  const handleXpEarned = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["xp-logs", user.id] });
    checkAskedGuidanceBadge();
    if (isSimplifiedMode) completeOnboarding("rep");
    markFirstActionCompleted();
  }, [queryClient, user.id, checkAskedGuidanceBadge, isSimplifiedMode, completeOnboarding, markFirstActionCompleted]);

  const handleOperatorInteraction = useCallback(() => {
    handleXpEarned();
    trackGuideInteraction("message");
    if (isSimplifiedMode) completeOnboarding("operator");
    markFirstActionCompleted();
  }, [handleXpEarned, isSimplifiedMode, completeOnboarding, trackGuideInteraction, markFirstActionCompleted]);

  const quickStartEnabled = onboardingQuickStartEnabled();

  // Onboarding
  if (needsOnboarding && currentOnboardingStep) {
    if (quickStartEnabled) {
      return (
        <OnboardingQuickStartFlow
          isPaid={isPaid}
          createQuest={createQuest}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ["user-onboarding"] })}
          onUpdateOnboarding={async (data) => { await updateOnboardingProgress(data); }}
        />
      );
    }
    return (
      <OnboardingFlow
        userId={user.id}
        initialStep={currentOnboardingStep}
        isPaid={isPaid}
        createQuest={createQuest}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["user-onboarding"] })}
        onUpdateOnboarding={async (data) => { await updateOnboardingProgress(data); }}
      />
    );
  }

  // Welcome Back
  if (showWelcomeBack) {
    return <WelcomeBackScreen onContinue={dismissWelcomeBack} onViewHistory={dismissWelcomeBack} />;
  }

  if (showFollowUp) {
    const currentJourney = activeSession?.journey_id ? getJourneyById(activeSession.journey_id) : null;
    return (
      <WelcomeBackFollowUp
        currentSnapshotTitle={currentJourney?.title}
        onKeepCurrent={dismissFollowUp}
        onChooseNew={() => { dismissFollowUp(); canStartSnapshot ? setShowJourneySwitcher(true) : startCheckout(undefined, "welcome_back_follow_up"); }}
        isPaid={isPaid}
        nudgeEnabled={nudgeEnabled}
        onEnableDailyAlignment={handleEnableDailyAlignment}
      />
    );
  }

  const todayAlreadyCompleted = completedDays.some((d) => d.day_number === currentDay);
  const hasPvaData = pvaData.some(d => d.items.length > 0) || pvaData.some(d => d.health && d.health.recovery !== null);

  return (
    <div className="space-y-4">
      {/* 1. Greeting Banner */}
      <GreetingBanner
        userId={user.id}
        totalXp={totalXp}
        streakDays={consecutiveStreak}
        visitCount={dashboardVisitCount}
        isPaid={isPaid || isTrialing}
        seasonName={activeSeason?.name}
        onSeasonClick={() => setShowSeasonSetup(true)}
        missionTitle={!activeSeason ? activeQuest?.title : undefined}
        onMissionClick={() => {
          if (activeQuest) { setEditingMissionTitle(activeQuest.title); setShowMissionEdit(true); }
        }}
        snapshotFocus={activeSession?.journey_id ? getJourneyById(activeSession.journey_id)?.title : undefined}
        snapshotEmoji={activeSession?.journey_id ? getJourneyById(activeSession.journey_id)?.emoji : undefined}
        onSnapshotClick={() => {
          canStartSnapshot || !!activeSession ? setShowJourneySwitcher(true) : startCheckout(undefined, "greeting_banner_snapshot");
        }}
      />

      {/* 1b. Readiness Bar — instant cross-system signal */}
      <TodayReadinessBar
        health={healthLatest}
        plannerCount={todayPlannerItems.length}
        wearableConnected={wearableConnected}
        calendarConnected={calendarConnected}
        trend={healthTrend}
        calendarIntel={todayCalendarIntel}
      />

      {/* 2. Daily Briefing Card — single morning AI brief */}
      {!entitlementsLoading && (
        <DailyBriefingCard
          isPaid={isPaid}
          isTrialing={isTrialing}
          hasActiveSnapshot={!!activeSession && !isCompleted && !isExpired}
          onUpgrade={() => startCheckout(undefined, "daily_briefing")}
          healthRecovery={healthLatest?.recovery}
          plannerCount={todayPlannerItems.length}
        />
      )}

      {/* 3. Today's Actions */}
      {(resetLoading || dashboardLoading) ? <ResetProgressSkeleton /> : (
        <TodayActions
          userId={user.id}
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
          todayXpEarned={xpLogs.filter((log) => new Date(log.created_at).toLocaleDateString("sv-SE") === new Date().toLocaleDateString("sv-SE")).reduce((sum, log) => sum + log.amount, 0)}
          buildLastUpdatedAt={currentBuild?.updated_at ?? null}
          journeyId={activeSession?.journey_id ?? undefined}
          journeyTitle={activeSession?.journey_id ? getJourneyById(activeSession.journey_id)?.title : undefined}
          onChangeJourney={() => setShowJourneySwitcher(true)}
          missionTitle={activeQuest?.title}
          onOpenTimeLog={() => setShowConfirmLastNight(true)}
          onOpenPromises={() => setShowValidatePlan(true)}
          validatePlanCompleted={validatePlanCompleted}
          onOpenBuild={() => navigate("/growth")}
          onDay7AllComplete={triggerDay7Celebration}
        />
      )}

      {/* 4. Plan vs Actual — hero module */}
      <div id="pva">
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-foreground">Plan vs. Actual</h2>
          <p className="text-[10px] text-muted-foreground">What was planned · What your body says · What it means</p>
        </div>
        {hasPvaData ? (
          <PlanVsActualView days={pvaData} view="week" isWearableConnected={wearableConnected} syntheses={pvaSyntheses} projects={activeProjects} />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/30 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {!calendarConnected && !wearableConnected
                ? "Connect your calendar and wearable to see Plan vs. Actual."
                : !calendarConnected
                ? "Connect your calendar to see the full picture."
                : "Connect your wearable to complete the view."}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate(calendarConnected ? "/wellness" : "/planner")}>
              {calendarConnected ? "Connect Wearable →" : "Connect Calendar →"}
            </Button>
          </div>
        )}
      </div>

      {/* 4b. Fuel Today — compact meal surface */}
      <FuelTodayCard userId={user.id} isPaid={isPaid || isTrialing} />

      {/* 5. Compact 5 Rings */}
      <CompactRingsRow userId={user.id} />

      {/* 6. Forecast */}
      <ForecastCard data={intelligenceData} compact />

      {/* 7. Ask Dashboard — conversational entry point near bottom */}
      <AskDashboardBar />

      {/* --- Dialogs (modal overlays, no visual footprint) --- */}
      <ConfirmLastNightDialog
        open={showConfirmLastNight}
        onOpenChange={setShowConfirmLastNight}
        userId={user.id}
      />

      <ValidatePlanDialog
        open={showValidatePlan}
        onOpenChange={setShowValidatePlan}
        userId={user.id}
        onComplete={() => setValidatePlanCompleted(true)}
      />

      {/* Snapshot Selector Dialog */}
      {activeSession && !isCompleted && (
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

      {!activeSession && canStartSnapshot && (
        <StartSnapshotDialog
          isOpen={showJourneySwitcher}
          onOpenChange={setShowJourneySwitcher}
          onSelectSnapshot={async (snapshotId, asSeason) => {
            if (asSeason) {
              const seasonId = await startSeason();
              if (seasonId) {
                acceptCovenant({ isPaid, journeyId: snapshotId });
                setTimeout(async () => {
                  const { data: newSession } = await supabase.from("reset_sessions").select("id").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
                  if (newSession) await linkSnapshotToSeason(newSession.id, seasonId);
                }, 2000);
              }
            } else {
              acceptCovenant({ isPaid, journeyId: snapshotId });
              if (activeSeason) {
                setTimeout(async () => {
                  const { data: newSession } = await supabase.from("reset_sessions").select("id").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
                  if (newSession) await linkSnapshotToSeason(newSession.id, activeSeason.id);
                }, 2000);
              }
            }
            setShowJourneySwitcher(false);
          }}
          isStarting={isAcceptingCovenant}
          isPaid={isPaid}
        />
      )}

      {/* Season Complete Overlay */}
      {showSeasonComplete && seasonProgress && activeSeason && (
        <SeasonComplete
          season={{
            id: activeSeason.id,
            name: activeSeason.name,
            started_at: activeSeason.started_at,
            completed_at: activeSeason.completed_at,
            created_at: activeSeason.created_at,
          }}
          projects={(activeProjects || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            momentum_score: p.momentum_score,
            status: p.status,
            controllable: p.controllable,
          }))}
          seasonSnapshots={seasonSnapshots}
          progress={seasonProgress}
          healthData={seasonHealthData}
          onStartNewSeason={async () => {
            setShowSeasonComplete(false);
            setShowSeasonSetup(true);
          }}
          onDismiss={() => setShowSeasonComplete(false)}
        />
      )}

      {/* Season Setup Flow */}
      <SeasonSetup
        open={showSeasonSetup}
        onClose={() => setShowSeasonSetup(false)}
        userId={user.id}
        onStartSeason={async (params) => {
          const id = await startSeason(params);
          return id;
        }}
        onCreateProject={async (params) => {
          await createProject.mutateAsync(params);
        }}
      />

      {/* Mission Edit Modal */}
      <Dialog open={showMissionEdit} onOpenChange={setShowMissionEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Set Your Direction
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">This can evolve. You're just choosing where to point right now.</p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">Direction, not a task.</p>
              <Input value={editingMissionTitle} onChange={(e) => setEditingMissionTitle(e.target.value)} placeholder="e.g., Reclaim Energy, Build Discipline" className="text-base" />
            </div>
            <Button className="w-full" onClick={() => { if (activeQuest && editingMissionTitle.trim()) { handleUpdateQuest({ questId: activeQuest.id, title: editingMissionTitle.trim() }); setShowMissionEdit(false); } }} disabled={!editingMissionTitle.trim() || isUpdatingQuest}>
              {isUpdatingQuest ? "Updating..." : "Update Direction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. Footer */}
      <footer className="py-6 text-center space-y-1">
        {dashboardVisitCount > 5 && <p className="text-xs text-muted-foreground/60">Quiet momentum. One check-in at a time.</p>}
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
