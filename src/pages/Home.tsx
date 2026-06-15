import { useEffect, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useReset } from "@/hooks/useReset";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useHealthData } from "@/hooks/useHealthData";
import { useAutoWearableSync } from "@/hooks/useAutoWearableSync";
import { usePlannerItems, getWeekRange, type PlannerItem } from "@/hooks/usePlanner";
import { analyzeCalendar } from "@/lib/calendarIntelligence";
import { useWeeklyTracker } from "@/hooks/useWeeklyTracker";
import { useGameSignals } from "@/hooks/useGameSignals";
import { useDriftAlignment } from "@/hooks/useDriftAlignment";
import { WeeklyPulseScreen } from "@/components/dashboard/WeeklyPulseScreen";

import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { ReturnFromDriftCard } from "@/components/dashboard/ReturnFromDriftCard";
import { BossBattleBanner } from "@/components/dashboard/BossBattleBanner";
import { DailyReadingCard } from "@/components/dashboard/DailyReadingCard";
import { DailyOperatorBrief } from "@/components/dashboard/DailyOperatorBrief";
import { WeeklyAIInsightCard } from "@/components/dashboard/WeeklyAIInsightCard";
import { TodaysReadCard } from "@/components/dashboard/TodaysReadCard";
import { ControlReleaseMoveCard } from "@/components/dashboard/ControlReleaseMoveCard";
import { DailyOperatorOnboardingFlow, OnboardingFlow, OnboardingQuickStartFlow } from "@/components/onboarding";

export default function Home() {
  usePageViewTracking("Today");
  const { trackEvent } = useAnalytics();
  const user = useLifeOSUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [pulseDismissed, setPulseDismissed] = useState(false);
  const [returnFromDriftDismissed, setReturnFromDriftDismissed] = useState(false);

  const { isLoading: resetLoading } = useReset(user.id);

  const {
    isLoading: onboardingLoading,
    needsOnboarding,
    needsDailyOperatorOnboarding,
    currentOnboardingStep,
    updateOnboardingProgress,
    completeDailyOperatorOnboarding,
    isCompletingDailyOperatorOnboarding,
  } = useOnboarding(user.id);

  const { isPaid } = useEntitlements(user.id);
  const { data: weeklyTrackerData, previousWeek: prevWeekScores, isLoading: weeklyTrackerLoading } = useWeeklyTracker(user.id);

  // Health & calendar signals
  const { isConnected: wearableConnected, provider: wearableProvider, latest: healthLatest } = useHealthData(user.id);
  useAutoWearableSync(user.id, wearableProvider, wearableConnected);

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

  const todayStr = new Date().toLocaleDateString("sv-SE");
  const weekRange = useMemo(() => getWeekRange(new Date()), []);
  const { data: weekPlannerItems = [] } = usePlannerItems(weekRange.start, weekRange.end, user.id);
  const todayPlannerItems = useMemo(
    () => weekPlannerItems.filter((item: PlannerItem) => item.scheduled_date === todayStr),
    [weekPlannerItems, todayStr],
  );
  const todayCalendarIntel = useMemo(() => analyzeCalendar(todayPlannerItems), [todayPlannerItems]);
  const {
    signals,
    calendar: signalCalendar,
    wearable: signalWearable,
    checkIn: signalCheckIn,
  } = useGameSignals({
    userId: user.id,
    wearable: {
      connected: wearableConnected,
      recovery: healthLatest.recovery,
      sleepMinutes: healthLatest.sleepMinutes,
      strain: healthLatest.strain,
    },
    calendar: {
      connected: calendarConnected,
      plannerCount: todayPlannerItems.length,
      meetingCount: todayCalendarIntel?.meetingCount ?? 0,
      meetingMinutes: todayCalendarIntel?.meetingMinutes ?? 0,
      longestFocusBlock: todayCalendarIntel?.longestFocusBlock ?? 0,
      contextSwitches: todayCalendarIntel?.contextSwitches ?? 0,
      dayType: todayCalendarIntel?.dayType ?? null,
      overloadedPeriod: todayCalendarIntel?.overloadedPeriod ?? null,
    },
  });
  const { drift } = useDriftAlignment({
    userId: user.id,
    enabled: true,
    signals,
    calendar: signalCalendar,
    wearable: signalWearable,
    checkIn: signalCheckIn,
  });
  const returnFromDriftDismissKey = useMemo(
    () => `return_from_drift_${user.id}_${todayStr}`,
    [user.id, todayStr],
  );

  // Pulse dismiss
  useEffect(() => {
    const key = `pulse_seen_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
    try { if (sessionStorage.getItem(key) === "1") setPulseDismissed(true); } catch { /* sessionStorage may be unavailable */ }
  }, [user.id]);

  const dismissPulse = useCallback(() => {
    setPulseDismissed(true);
    const key = `pulse_seen_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
    try { sessionStorage.setItem(key, "1"); } catch { /* sessionStorage may be unavailable */ }
  }, [user.id]);

  useEffect(() => {
    try {
      setReturnFromDriftDismissed(localStorage.getItem(returnFromDriftDismissKey) === "1");
    } catch {
      setReturnFromDriftDismissed(false);
    }
  }, [returnFromDriftDismissKey]);

  const dismissReturnFromDrift = useCallback(() => {
    setReturnFromDriftDismissed(true);
    try {
      localStorage.setItem(returnFromDriftDismissKey, "1");
    } catch {
      // localStorage may be unavailable.
    }
  }, [returnFromDriftDismissKey]);

  // Handle wearable OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("wearable_connected");
    const wError = searchParams.get("wearable_error");
    if (connected) {
      toast({ title: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, description: "Your data will sync shortly." });
      queryClient.invalidateQueries({ queryKey: ["wearable-connections"] });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_connected");
      setSearchParams(next, { replace: true });
    } else if (wError) {
      toast({ title: "Connection failed", description: wError.replace(/_/g, " "), variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  // Retention tracking
  useEffect(() => {
    const lastVisitKey = `last_dashboard_visit_${user.id}`;
    const todayStr = new Date().toLocaleDateString("sv-SE");
    try {
      const lastVisit = localStorage.getItem(lastVisitKey);
      if (lastVisit !== todayStr) {
        const daysSince = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000) : null;
        trackEvent("retention", "daily_return", { days_since_last_visit: daysSince });
        localStorage.setItem(lastVisitKey, todayStr);
      }
    } catch {
      // localStorage may be unavailable.
    }
  }, [user.id, trackEvent]);

  const quickStartEnabled = onboardingQuickStartEnabled();

  if (onboardingLoading || resetLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pb-24">
        <div className="h-6 w-36 rounded bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    );
  }

  if (needsDailyOperatorOnboarding) {
    return (
      <DailyOperatorOnboardingFlow
        isSubmitting={isCompletingDailyOperatorOnboarding}
        onComplete={async (answers) => {
          await completeDailyOperatorOnboarding(answers);
          const key = `pulse_seen_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
          try { sessionStorage.setItem(key, "1"); } catch { /* sessionStorage may be unavailable */ }
          queryClient.invalidateQueries({ queryKey: ["ai-daily-operator-brief", user.id] });
        }}
      />
    );
  }

  // Onboarding
  if (needsOnboarding && currentOnboardingStep) {
    if (quickStartEnabled) {
      return (
        <OnboardingQuickStartFlow
          isPaid={isPaid}
          createQuest={async () => {}}
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
        createQuest={async () => {}}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["user-onboarding"] })}
        onUpdateOnboarding={async (data) => { await updateOnboardingProgress(data); }}
      />
    );
  }

  // Weekly Pulse Screen
  if (!pulseDismissed && !weeklyTrackerLoading && weeklyTrackerData) {
    return (
      <WeeklyPulseScreen
        data={weeklyTrackerData}
        previousWeek={prevWeekScores}
        onDismiss={dismissPulse}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      {/* 1. Today Header — date, greeting, day type, summary */}
      <TodayHeader
        userId={user.id}
        health={healthLatest}
        calendarIntel={todayCalendarIntel}
        wearableConnected={wearableConnected}
        calendarConnected={calendarConnected}
        drift={drift}
      />

      {/* 2. Today's Read - book-aligned signal translation */}
      <TodaysReadCard signals={signals} />

      {/* 3. Control / Release / Move - the daily book practice */}
      <ControlReleaseMoveCard
        userId={user.id}
        mainMission={signals?.suggestedMainQuest}
      />

      {/* 4. Daily Operator - one AI-native command center with confirmable actions */}
      <DailyOperatorBrief userId={user.id} />

      {drift?.shouldShowReturnFromDrift && !returnFromDriftDismissed ? (
        <ReturnFromDriftCard drift={drift} onDismiss={dismissReturnFromDrift} />
      ) : null}

      <BossBattleBanner signals={signals} />

      {/* 5. Daily reading - secondary insight */}
      <DailyReadingCard userId={user.id} />

      {/* 6. Weekly AI insight - privacy-safe share card */}
      <WeeklyAIInsightCard userId={user.id} />

      <footer className="pt-6 pb-4 text-center">
        <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
