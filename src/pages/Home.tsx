import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, Check, X } from "lucide-react";
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
import { WelcomeBackScreen, WelcomeBackFollowUp, WelcomeBackBanner } from "@/components/welcome-back";
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

// Dashboard modules
import { MainQuestModule } from "@/components/dashboard/MainQuestModule";
import { XpMomentumModule } from "@/components/dashboard/XpMomentumModule";
import { IntegrityMeterModule } from "@/components/dashboard/IntegrityMeterModule";
import { TimeCurrencyModule } from "@/components/dashboard/TimeCurrencyModule";
import { BuildOverviewModule } from "@/components/dashboard/BuildOverviewModule";
import { SnapshotSelector } from "@/components/dashboard/SnapshotSelector";
import { StartSnapshotDialog } from "@/components/dashboard/StartSnapshotDialog";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
import { TodayActions } from "@/components/dashboard/TodayActions";
import { SnapshotReviewCard } from "@/components/dashboard/SnapshotReviewCard";
import { DailyAlignmentSpotlight } from "@/components/dashboard/DailyAlignmentSpotlight";
import { AskDashboardBar } from "@/components/dashboard/AskDashboardBar";
import { ForecastCard } from "@/components/dashboard/ForecastCard";
import { AIRecommendedActions } from "@/components/dashboard/AIRecommendedActions";
import { SeasonComplete } from "@/components/SeasonComplete";
import { CompactRingsRow } from "@/components/dashboard/CompactRingsRow";
import {
  MainQuestSkeleton,
  ResetProgressSkeleton,
  SmallModuleSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import { OnboardingFlow, OnboardingQuickStartFlow } from "@/components/onboarding";
import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";
import { ConfirmLastNightDialog } from "@/components/dashboard/ConfirmLastNightDialog";
import { ValidatePlanDialog } from "@/components/dashboard/ValidatePlanDialog";

export default function Home() {
  usePageViewTracking("Home");
  const { trackEvent } = useAnalytics();
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showJourneySwitcher, setShowJourneySwitcher] = useState(false);
  const [showMissionEdit, setShowMissionEdit] = useState(false);
  const [editingMissionTitle, setEditingMissionTitle] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [showConfirmLastNight, setShowConfirmLastNight] = useState(false);

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
    seasonSnapshots,
    seasonProgress,
    startSeason,
    linkSnapshotToSeason,
    completeSeason,
    shouldShowSeasonComplete,
  } = useSeason(user.id);

  const { rings, completedCount } = useDailyRings(user.id);
  const { data: intelligenceData } = useDashboardIntelligence(user.id, completedCount, rings);

  const [showSeasonComplete, setShowSeasonComplete] = useState(false);
  useEffect(() => {
    if (shouldShowSeasonComplete) { setShowSeasonComplete(true); completeSeason(); }
  }, [shouldShowSeasonComplete, completeSeason]);

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
  const showDashboardPaywallPromo = useInlinePaywall;

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

  return (
    <div className="space-y-4">
      {/* Controllable "Powered by" */}
      <ControllablePoweredBy controllables={["awareness", "perspective", "habit", "wellness", "environment"]} />

      {showReturnBanner && <WelcomeBackBanner />}

      {/* Daily Alignment Spotlight */}
      {!entitlementsLoading && (
        <DailyAlignmentSpotlight
          userId={user.id}
          isPaid={isPaid}
          nudgeEnabled={nudgeEnabled}
          onEnable={handleEnableDailyAlignment}
          onUpgrade={() => startCheckout(undefined, "daily_alignment_spotlight")}
          onDismiss={() => {}}
        />
      )}

      {/* Greeting Banner */}
      <GreetingBanner
        userId={user.id}
        totalXp={totalXp}
        streakDays={consecutiveStreak}
        visitCount={dashboardVisitCount}
        isPaid={isPaid || isTrialing}
        missionTitle={activeQuest?.title}
        onMissionClick={() => {
          if (activeQuest) { setEditingMissionTitle(activeQuest.title); setShowMissionEdit(true); }
        }}
        snapshotFocus={activeSession?.journey_id ? getJourneyById(activeSession.journey_id)?.title : undefined}
        snapshotEmoji={activeSession?.journey_id ? getJourneyById(activeSession.journey_id)?.emoji : undefined}
        onSnapshotClick={() => {
          canStartSnapshot || !!activeSession ? setShowJourneySwitcher(true) : startCheckout(undefined, "greeting_banner_snapshot");
        }}
      />


      {/* Main Quest - only show when no active quest */}
      {dashboardLoading ? <MainQuestSkeleton /> : !activeQuest && (
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
      )}

      {/* Snapshot Review */}
      {(((hasEndedTrial && !isPaid) || (!activeSession && allSessions.some(s => s.status === "completed" || s.status === "expired" || s.status === "paused"))) ||
        (activeSession && (isCompleted || isExpired))) && !resetLoading && !dashboardLoading && (
        <SnapshotReviewCard
          userId={user.id}
          isPaid={isPaid}
          onStartNewSnapshot={canStartSnapshot ? () => setShowJourneySwitcher(true) : undefined}
          onUpgrade={() => startCheckout(undefined, "snapshot_review_card")}
        />
      )}

      {/* Today's Actions */}
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
          onOpenPromises={() => navigate("/growth")}
          onOpenBuild={() => navigate("/growth")}
          onDay7AllComplete={triggerDay7Celebration}
        />
      )}

      {/* Confirm Last Night Dialog */}
      <ConfirmLastNightDialog
        open={showConfirmLastNight}
        onOpenChange={setShowConfirmLastNight}
        userId={user.id}
      />

      {/* Ask Dashboard — directly after actions for seamless collapse */}
      <AskDashboardBar />

      {/* Compact 5 Rings */}
      <CompactRingsRow userId={user.id} />

      {/* Forecast + Recommendations */}
      <ForecastCard data={intelligenceData} />
      <AIRecommendedActions data={intelligenceData} />

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
      {showSeasonComplete && seasonProgress && (
        <SeasonComplete
          seasonName={activeSeason?.name}
          snapshots={seasonSnapshots}
          progress={seasonProgress}
          onStartNewSeason={async () => {
            setShowSeasonComplete(false);
            const newSeasonId = await startSeason();
            if (newSeasonId) setShowJourneySwitcher(true);
          }}
          onTakeBreak={() => setShowSeasonComplete(false)}
          onDismiss={() => setShowSeasonComplete(false)}
        />
      )}

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

      {/* Footer */}
      <footer className="py-6 text-center space-y-1">
        {dashboardVisitCount > 5 && <p className="text-xs text-muted-foreground/60">Quiet momentum. One check-in at a time.</p>}
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
