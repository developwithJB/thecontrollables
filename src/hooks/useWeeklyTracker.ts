import { useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";

type RecapData = Record<string, unknown>;

type WeeklyTrackingRow = {
  id: string | null;
  recap_data?: RecapData | null;
  overall_score?: number | null;
  rings_score?: number | null;
  wearable_score?: number | null;
  planner_score?: number | null;
  nutrition_score?: number | null;
  money_score?: number | null;
};

type WeeklyRingRow = {
  ring_date: string;
  notice_completed: boolean | null;
  choose_completed: boolean | null;
  prove_completed: boolean | null;
  charge_completed: boolean | null;
  align_completed: boolean | null;
};

type WeeklyHealthRow = {
  recovery_score: number | null;
  sleep_minutes: number | null;
};

type WeeklyPlannerRow = {
  status: string | null;
  scheduled_date: string | null;
};

type WeeklyMealRow = {
  log_date: string | null;
};

type WeeklyTransactionRow = {
  id: string;
};

type WeeklyXpRow = {
  amount: number | null;
};

export interface WeeklyScores {
  rings: number;
  wearable: number;
  planner: number;
  nutrition: number;
  money: number;
  overall: number;
}

export interface WeeklyTrackerData {
  id: string | null;
  weekStart: string;
  weekEnd: string;
  dayOfWeek: number; // 0=Sun..6=Sat
  daysElapsed: number;
  daysRemaining: number;
  scores: WeeklyScores;
  totalXp: number;
  daysActive: number;
  isRecapReady: boolean;
  recapData: RecapData | null;
  // Raw signals for the pulse screen
  ringsToday: number;
  ringsWeekAvg: number;
  sleepAvg: number | null;
  recoveryAvg: number | null;
  mealsLogged: number;
  tasksCompleted: number;
  tasksTotal: number;
  transactionsThisWeek: number;
}

function getSundayWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 });
}

function getSaturdayWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 0 });
}

export function useWeeklyTracker(userId: string | undefined) {
  const devMockAuth = isDevMockAuthEnabled();
  const now = useMemo(() => new Date(), []);
  const weekStart = format(getSundayWeekStart(now), "yyyy-MM-dd");
  const weekEnd = format(getSaturdayWeekEnd(now), "yyyy-MM-dd");
  const dayOfWeek = now.getDay();
  const daysElapsed = dayOfWeek; // Sunday=0 means 0 days elapsed
  const daysRemaining = 6 - dayOfWeek;

  // Ensure weekly_tracking row exists
  const { data: trackingRow, isLoading: rowLoading } = useQuery<WeeklyTrackingRow | null>({
    queryKey: ["weekly-tracking", userId, weekStart],
    queryFn: async () => {
      // Try to get existing
      const { data: existing } = await supabase
        .from("weekly_tracking")
        .select("*")
        .eq("user_id", userId!)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) return existing as WeeklyTrackingRow;

      // Create new week
      const { data: newRow, error } = await supabase
        .from("weekly_tracking")
        .insert({
          user_id: userId!,
          week_start: weekStart,
          week_end: weekEnd,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create weekly tracking:", error);
        return null;
      }
      return newRow as WeeklyTrackingRow;
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch rings data for this week
  const { data: weekRings = [] } = useQuery<WeeklyRingRow[]>({
    queryKey: ["weekly-rings", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_rings")
        .select("ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
        .eq("user_id", userId!)
        .gte("ring_date", weekStart)
        .lte("ring_date", weekEnd);
      return (data || []) as WeeklyRingRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch health data for this week
  const { data: weekHealth = [] } = useQuery<WeeklyHealthRow[]>({
    queryKey: ["weekly-health", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("sync_date, recovery_score, sleep_minutes, strain_score")
        .eq("user_id", userId!)
        .gte("sync_date", weekStart)
        .lte("sync_date", weekEnd);
      return (data || []) as WeeklyHealthRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch planner items for this week
  const { data: weekPlanner = [] } = useQuery<WeeklyPlannerRow[]>({
    queryKey: ["weekly-planner-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("planner_items")
        .select("id, status, scheduled_date")
        .eq("user_id", userId!)
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", weekEnd);
      return (data || []) as WeeklyPlannerRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch meal logs for this week
  const { data: weekMeals = [] } = useQuery<WeeklyMealRow[]>({
    queryKey: ["weekly-meals-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_logs")
        .select("id, log_date")
        .eq("user_id", userId!)
        .gte("log_date", weekStart)
        .lte("log_date", weekEnd);
      return (data || []) as WeeklyMealRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch transactions for this week
  const { data: weekTransactions = [] } = useQuery<WeeklyTransactionRow[]>({
    queryKey: ["weekly-transactions-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId!)
        .gte("transaction_date", weekStart)
        .lte("transaction_date", weekEnd);
      return (data || []) as WeeklyTransactionRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 5 * 60 * 1000,
  });

  // XP this week
  const { data: weekXp = [] } = useQuery<WeeklyXpRow[]>({
    queryKey: ["weekly-xp-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("xp_logs")
        .select("amount, created_at")
        .eq("user_id", userId!)
        .gte("created_at", `${weekStart}T00:00:00`)
        .lte("created_at", `${weekEnd}T23:59:59`);
      return (data || []) as WeeklyXpRow[];
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 2 * 60 * 1000,
  });

  // Compute scores
  const computed = useMemo(() => {
    // Rings: % of possible rings completed (5 per day * days elapsed)
    const totalPossibleRings = Math.max(1, (daysElapsed + 1) * 5);
    let totalRingsCompleted = 0;
    const todayStr = format(now, "yyyy-MM-dd");
    let ringsToday = 0;

    weekRings.forEach((r) => {
      let dayCount = 0;
      if (r.notice_completed) dayCount++;
      if (r.choose_completed) dayCount++;
      if (r.prove_completed) dayCount++;
      if (r.charge_completed) dayCount++;
      if (r.align_completed) dayCount++;
      totalRingsCompleted += dayCount;
      if (r.ring_date === todayStr) ringsToday = dayCount;
    });

    const ringsScore = Math.min(100, (totalRingsCompleted / totalPossibleRings) * 100);
    const ringsWeekAvg = weekRings.length > 0 ? totalRingsCompleted / weekRings.length : 0;

    // Wearable: avg recovery score (0-100 already)
    const recoveries = weekHealth
      .map((h) => h.recovery_score)
      .filter((v): v is number => v != null);
    const recoveryAvg = recoveries.length > 0 ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : null;
    const sleepMins = weekHealth
      .map((h) => h.sleep_minutes)
      .filter((v): v is number => v != null);
    const sleepAvg = sleepMins.length > 0 ? sleepMins.reduce((a, b) => a + b, 0) / sleepMins.length : null;
    const wearableScore = recoveryAvg ?? 50; // default 50 if no data

    // Planner: % of tasks completed
    const totalTasks = weekPlanner.length;
    const completedTasks = weekPlanner.filter((p) => p.status === "done").length;
    const plannerScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;

    // Nutrition: meals logged vs expected (3 per day)
    const expectedMeals = Math.max(1, (daysElapsed + 1) * 3);
    const nutritionScore = Math.min(100, (weekMeals.length / expectedMeals) * 100);

    // Money: tracked = good. Simple binary: logged > 0 = 100, 0 = 0
    const moneyScore = weekTransactions.length > 0 ? Math.min(100, 50 + weekTransactions.length * 5) : 0;

    const overallScore = (ringsScore + wearableScore + plannerScore + nutritionScore + moneyScore) / 5;

    // Days active = unique dates with any activity
    const activeDates = new Set<string>();
    weekRings.forEach((r) => activeDates.add(r.ring_date));
    weekPlanner.forEach((p) => {
      if (p.status === "done" && p.scheduled_date) activeDates.add(p.scheduled_date);
    });
    weekMeals.forEach((m) => {
      if (m.log_date) activeDates.add(m.log_date);
    });

    const totalXp = weekXp.reduce((sum, x) => sum + (x.amount || 0), 0);

    return {
      scores: {
        rings: Math.round(ringsScore),
        wearable: Math.round(wearableScore),
        planner: Math.round(plannerScore),
        nutrition: Math.round(nutritionScore),
        money: Math.round(moneyScore),
        overall: Math.round(overallScore),
      },
      ringsToday,
      ringsWeekAvg: Math.round(ringsWeekAvg * 10) / 10,
      sleepAvg: sleepAvg ? Math.round(sleepAvg) : null,
      recoveryAvg: recoveryAvg ? Math.round(recoveryAvg) : null,
      mealsLogged: weekMeals.length,
      tasksCompleted: completedTasks,
      tasksTotal: totalTasks,
      transactionsThisWeek: weekTransactions.length,
      daysActive: activeDates.size,
      totalXp,
    };
  }, [weekRings, weekHealth, weekPlanner, weekMeals, weekTransactions, weekXp, daysElapsed, now]);

  // Update scores in DB periodically
  const updateScores = useCallback(async () => {
    if (!trackingRow?.id) return;
    await supabase
      .from("weekly_tracking")
      .update({
        rings_score: computed.scores.rings,
        wearable_score: computed.scores.wearable,
        planner_score: computed.scores.planner,
        nutrition_score: computed.scores.nutrition,
        money_score: computed.scores.money,
        overall_score: computed.scores.overall,
        total_xp_earned: computed.totalXp,
        days_active: computed.daysActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trackingRow.id);
  }, [trackingRow?.id, computed]);

  // Update scores on mount/change
  useEffect(() => {
    if (trackingRow?.id) updateScores();
  }, [trackingRow?.id, updateScores]);

  // Previous week for comparison
  const { data: previousWeek } = useQuery<WeeklyTrackingRow | null>({
    queryKey: ["weekly-tracking-prev", userId, weekStart],
    queryFn: async () => {
      const prevStart = new Date(weekStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const { data } = await supabase
        .from("weekly_tracking")
        .select("*")
        .eq("user_id", userId!)
        .eq("week_start", format(prevStart, "yyyy-MM-dd"))
        .maybeSingle();
      return data as WeeklyTrackingRow | null;
    },
    enabled: !!userId && !devMockAuth,
    staleTime: 30 * 60 * 1000,
  });

  const isRecapReady = dayOfWeek === 0 && !!previousWeek?.recap_data && Object.keys(previousWeek.recap_data as object).length > 0;

  const data: WeeklyTrackerData = {
    id: trackingRow?.id ?? null,
    weekStart,
    weekEnd,
    dayOfWeek,
    daysElapsed,
    daysRemaining,
    scores: computed.scores,
    totalXp: computed.totalXp,
    daysActive: computed.daysActive,
    isRecapReady,
    recapData: previousWeek?.recap_data ?? null,
    ringsToday: computed.ringsToday,
    ringsWeekAvg: computed.ringsWeekAvg,
    sleepAvg: computed.sleepAvg,
    recoveryAvg: computed.recoveryAvg,
    mealsLogged: computed.mealsLogged,
    tasksCompleted: computed.tasksCompleted,
    tasksTotal: computed.tasksTotal,
    transactionsThisWeek: computed.transactionsThisWeek,
  };

  return {
    data,
    isLoading: rowLoading,
    previousWeek: previousWeek
      ? {
          overall: Number(previousWeek.overall_score) || 0,
          rings: Number(previousWeek.rings_score) || 0,
          wearable: Number(previousWeek.wearable_score) || 0,
          planner: Number(previousWeek.planner_score) || 0,
          nutrition: Number(previousWeek.nutrition_score) || 0,
          money: Number(previousWeek.money_score) || 0,
        }
      : null,
  };
}
