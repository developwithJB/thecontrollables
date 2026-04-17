import { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { usePlannerItems, getWeekRange } from "@/hooks/usePlanner";
import { analyzeCalendar } from "@/lib/calendarIntelligence";
import { useWeeklyTracker } from "@/hooks/useWeeklyTracker";
import { useGameSignals } from "@/hooks/useGameSignals";
import { WeeklyPulseScreen } from "@/components/dashboard/WeeklyPulseScreen";

import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { BossBattleBanner } from "@/components/dashboard/BossBattleBanner";
import { PrimaryGuidanceCard } from "@/components/dashboard/PrimaryGuidanceCard";
import { ProtectEnergyCard } from "@/components/dashboard/ProtectEnergyCard";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { DailyReadingCard } from "@/components/dashboard/DailyReadingCard";
import { OnboardingFlow, OnboardingQuickStartFlow } from "@/components/onboarding";

export default function Home() {
  usePageViewTracking("Today");
  const { trackEvent } = useAnalytics();
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [pulseDismissed, setPulseDismissed] = useState(false);

  const { activeSession, isLoading: resetLoading } = useReset(user.id);

  const {
    isLoading: onboardingLoading,
    needsOnboarding,
    currentOnboardingStep,
    updateOnboardingProgress,
  } = useOnboarding(user.id);

  const { isPaid, isLoading: entitlementsLoading } = useEntitlements(user.id);
  const { data: weeklyTrackerData, previousWeek: prevWeekScores, isLoading: weeklyTrackerLoading } = useWeeklyTracker(user.id);

  // Health & calendar signals
  const { trend: healthTrend, isConnected: wearableConnected, provider: wearableProvider, latest: healthLatest } = useHealthData(user.id);
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
  const todayPlannerItems = useMemo(() => weekPlannerItems.filter((i: any) => i.scheduled_date === todayStr), [weekPlannerItems, todayStr]);
  const todayCalendarIntel = useMemo(() => analyzeCalendar(todayPlannerItems), [todayPlannerItems]);
  const { signals } = useGameSignals({
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

  // Pulse dismiss
  useEffect(() => {
    const key = `pulse_seen_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
    try { if (sessionStorage.getItem(key) === "1") setPulseDismissed(true); } catch {}
  }, [user.id]);

  const dismissPulse = useCallback(() => {
    setPulseDismissed(true);
    const key = `pulse_seen_${user.id}_${new Date().toLocaleDateString("sv-SE")}`;
    try { sessionStorage.setItem(key, "1"); } catch {}
  }, [user.id]);

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
    } catch {}
  }, [user.id, trackEvent]);

  const quickStartEnabled = onboardingQuickStartEnabled();

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
      />

      <BossBattleBanner signals={signals} />

      {/* 2. What matters most today */}
      <PrimaryGuidanceCard
        signals={signals}
        health={healthLatest}
        calendarIntel={todayCalendarIntel}
        wearableConnected={wearableConnected}
        userId={user.id}
        plannerCount={todayPlannerItems.length}
        calendarConnected={calendarConnected}
      />

      {/* 3. Protect your energy */}
      <ProtectEnergyCard
        health={healthLatest}
        calendarIntel={todayCalendarIntel}
        wearableConnected={wearableConnected}
      />

      {/* 4. Next best move */}
      <NextMoveCard
        signals={signals}
        health={healthLatest}
        calendarIntel={todayCalendarIntel}
        wearableConnected={wearableConnected}
      />

      {/* 5. Daily reading — secondary insight */}
      <DailyReadingCard userId={user.id} />

      <footer className="pt-6 pb-4 text-center">
        <p className="text-xs text-muted-foreground/50">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
