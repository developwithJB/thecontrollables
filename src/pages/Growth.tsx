import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useDailyRings } from "@/hooks/useDailyRings";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { useReset } from "@/hooks/useReset";
import { useCircle } from "@/hooks/useCircle";
import { useSeason } from "@/hooks/useSeason";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { getDefaultCheckoutPlan } from "@/lib/featureFlags";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHealthData } from "@/hooks/useHealthData";
import { usePlannerItems, getWeekRange } from "@/hooks/usePlanner";
import { analyzeCalendar } from "@/lib/calendarIntelligence";

import { DailyRings } from "@/components/dashboard/DailyRings";
import { WeeklyRecapCard } from "@/components/dashboard/WeeklyRecapCard";
import { ForecastCard } from "@/components/dashboard/ForecastCard";
import { QuickHistoryEntry } from "@/components/dashboard/QuickHistoryEntry";
import { AskDashboardBar } from "@/components/dashboard/AskDashboardBar";
import { AIRecommendedActions } from "@/components/dashboard/AIRecommendedActions";
import { BuildOverviewModule } from "@/components/dashboard/BuildOverviewModule";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";
import { ProofHistory } from "@/components/dashboard/IGProofHistory";
import { ResetProgressModule } from "@/components/dashboard/ResetProgressModule";
import { CircleCard } from "@/components/dashboard/CircleCard";
import { SeasonBanner } from "@/components/dashboard/SeasonBanner";
import { MainQuestModule } from "@/components/dashboard/MainQuestModule";

import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";
import { GameRulesSection } from "@/components/GameRulesSection";
import { DashboardManualSection } from "@/components/DashboardManualSection";
import { GrowthBodyInsight } from "@/components/dashboard/GrowthBodyInsight";

export default function Growth() {
  usePageViewTracking("Growth");
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isPaid, initiateCheckout, isCheckingOut } = useEntitlements(user.id);
  const { currentBuild } = useBuildAssessment();
  const { rings, completedCount } = useDailyRings(user.id);
  const { isConnected: wearableConnected, latest: healthLatest, trend: healthTrend } = useHealthData(user.id);

  // Calendar intelligence for today
  const growthWeekRange = useMemo(() => getWeekRange(new Date()), []);
  const { data: growthPlannerItems = [] } = usePlannerItems(growthWeekRange.start, growthWeekRange.end, user.id);
  const growthCalendarIntel = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("sv-SE");
    const todayItems = growthPlannerItems.filter((i: any) => i.scheduled_date === todayStr);
    return analyzeCalendar(todayItems);
  }, [growthPlannerItems]);

  const intelligence = useDashboardIntelligence(user.id, completedCount, rings);
  const {
    activeSession,
    currentDay,
    isCompleted,
    isExpired,
    completedDays,
    acceptCovenant,
    isAcceptingCovenant,
  } = useReset(user.id);

  const {
    activeQuest,
    createQuest,
    isCreatingQuest,
    updateQuest,
    isUpdatingQuest,
    completeQuest,
    isCompletingQuest,
    isAuthReady,
  } = useDashboardSummary(user.id);

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
  } = useCircle(user.id, activeSession?.id);

  const {
    activeSeason,
    seasonProgress,
    closeSeason,
  } = useSeason(user.id);

  const { data: allSessions = [] } = useQuery({
    queryKey: ["all-reset-sessions", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("reset_sessions").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
      return data || [];
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  });

  const [showProof, setShowProof] = useState(false);
  const hasActiveSession = !!activeSession && !isCompleted && !isExpired;
  const todayAlreadyCompleted = completedDays.some((d) => d.day_number === currentDay);

  // Circle invites
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const joinCodeFromUrl = searchParams.get("join");
  useEffect(() => {
    if (joinCodeFromUrl && user.id) setJoinDialogOpen(true);
  }, [joinCodeFromUrl, user.id]);

  const circleDisplayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "You";

  // Auto-log circle showed-up
  const prevCompletedDaysRef = useRef<number>(0);
  useEffect(() => {
    if (!completedDays || !myCircle) return;
    const count = completedDays.length;
    if (count > prevCompletedDaysRef.current && count > 0) logShowedUp(count);
    prevCompletedDaysRef.current = count;
  }, [completedDays?.length, myCircle, logShowedUp]);

  const startCheckout = useCallback(
    (source = "growth") => {
      void initiateCheckout(getDefaultCheckoutPlan(), { source });
    },
    [initiateCheckout],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌱</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">Growth</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your self-leadership operating panel.</p>
      </div>

      <ControllablePoweredBy controllables={["perspective", "habit", "environment"]} />

      {/* Season Banner */}
      {activeSeason && seasonProgress && (
        <SeasonBanner seasonName={activeSeason.name} snapshots={[]} progress={seasonProgress} onCloseSeason={closeSeason} />
      )}

      {/* Main Quest — fallback for users without seasons */}
      {!activeQuest && !activeSeason && (
        <MainQuestModule
          activeQuest={activeQuest}
          onCreateQuest={(data) => createQuest(data)}
          onUpdateQuest={(data) => updateQuest(data)}
          onCompleteQuest={completeQuest}
          isCreating={isCreatingQuest}
          isUpdating={isUpdatingQuest}
          isCompleting={isCompletingQuest}
          disabled={!isAuthReady}
        />
      )}

      {/* Reset Progress */}
      {hasActiveSession && (
        <ResetProgressModule
          hasActiveSession={hasActiveSession}
          isCompleted={isCompleted}
          isExpired={isExpired}
          currentDay={currentDay}
          completedDays={completedDays}
          todayAlreadyCompleted={todayAlreadyCompleted}
          onStartReset={(isPaidArg) => acceptCovenant({ isPaid: isPaidArg })}
          isStartingReset={isAcceptingCovenant}
          isPaid={isPaid}
          totalSessionCount={allSessions.length}
          onUpgrade={() => startCheckout("reset_progress_module")}
          currentJourneyId={activeSession?.journey_id}
          onSwitchJourney={() => navigate("/reset")}
          lastCompletedAt={allSessions.find((s) => s.status === "completed")?.completed_at}
        />
      )}

      {/* 5 Daily Rings — the hero of Growth */}
      <DailyRings userId={user.id} />

      {/* Body & Schedule Intelligence — supporting layer */}
      {(wearableConnected && healthLatest.recovery !== null) || (growthCalendarIntel && growthCalendarIntel.meetingCount > 0) ? (
        <div className="max-w-sm mx-auto w-full">
          <GrowthBodyInsight userId={user.id} latest={healthLatest} trend={healthTrend} calendarIntel={growthCalendarIntel} />
        </div>
      ) : null}

      {/* Circle */}
      {hasActiveSession && (
        <CircleCard
          myCircle={myCircle ?? null}
          circleMembers={circleMembers}
          showedUpTodayCount={showedUpTodayCount}
          currentDay={currentDay}
          displayName={circleDisplayName}
          currentJourneyId={activeSession!.journey_id}
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
            if (!open && joinCodeFromUrl) { searchParams.delete("join"); setSearchParams(searchParams, { replace: true }); }
          }}
          initialJoinCode={joinCodeFromUrl || undefined}
          currentUserId={user.id}
          streakLeaderboard={streakLeaderboard}
        />
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-sm mx-auto w-full flex justify-center gap-2 flex-wrap"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowProof(!showProof)}
          className="gap-1.5 text-xs border-accent/30 hover:bg-accent/10"
        >
          <Camera className="w-3.5 h-3.5 text-accent-foreground" />
          Add Proof
        </Button>
        <QuickHistoryEntry userId={user.id} />
      </motion.div>

      {/* Ask bar */}
      <div className="max-w-sm mx-auto w-full">
        <AskDashboardBar />
      </div>

      {/* Forecast */}
      {completedCount >= 3 && (
        <div className="max-w-sm mx-auto w-full">
          <ForecastCard data={intelligence.data} />
        </div>
      )}

      {/* Weekly Review */}
      <div className="max-w-sm mx-auto w-full">
        <WeeklyRecapCard userId={user.id} />
      </div>

      {/* Proof card + history */}
      <AnimatePresence>
        {showProof && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-sm mx-auto w-full overflow-hidden space-y-3"
          >
            <ProofEntryCard userId={user.id} onClose={() => setShowProof(false)} />
            <ProofHistory userId={user.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recommended Actions — deeper reflection lives here */}
      <div className="max-w-sm mx-auto w-full">
        <AIRecommendedActions data={intelligence.data} />
      </div>

      {/* Build Overview */}
      <BuildOverviewModule compact />

      {/* Controllable Levels */}
      <ControllableLevelsCard userId={user.id} />

      {/* Game Rules & Manual */}
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
        className="block p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-center"
      >
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-primary" />
        <h3 className="font-display font-semibold text-foreground mb-2">Read the Full Book</h3>
        <p className="text-sm text-muted-foreground mb-4">Dive deeper into The Controllables on Amazon</p>
        <Button variant="outline" size="sm">Get the Book →</Button>
      </motion.a>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
