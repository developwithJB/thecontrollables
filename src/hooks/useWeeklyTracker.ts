import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, differenceInDays, isAfter } from "date-fns";

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
  recapData: any;
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
  const queryClient = useQueryClient();
  const now = new Date();
  const weekStart = format(getSundayWeekStart(now), "yyyy-MM-dd");
  const weekEnd = format(getSaturdayWeekEnd(now), "yyyy-MM-dd");
  const dayOfWeek = now.getDay();
  const daysElapsed = dayOfWeek; // Sunday=0 means 0 days elapsed
  const daysRemaining = 6 - dayOfWeek;

  // Ensure weekly_tracking row exists
  const { data: trackingRow, isLoading: rowLoading } = useQuery({
    queryKey: ["weekly-tracking", userId, weekStart],
    queryFn: async () => {
      // Try to get existing
      const { data: existing } = await supabase
        .from("weekly_tracking")
        .select("*")
        .eq("user_id", userId!)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) return existing;

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
      return newRow;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch rings data for this week
  const { data: weekRings = [] } = useQuery({
    queryKey: ["weekly-rings", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_rings")
        .select("ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
        .eq("user_id", userId!)
        .gte("ring_date", weekStart)
        .lte("ring_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch health data for this week
  const { data: weekHealth = [] } = useQuery({
    queryKey: ["weekly-health", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("sync_date, recovery_score, sleep_minutes, strain_score")
        .eq("user_id", userId!)
        .gte("sync_date", weekStart)
        .lte("sync_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch planner items for this week
  const { data: weekPlanner = [] } = useQuery({
    queryKey: ["weekly-planner-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("planner_items")
        .select("id, status, scheduled_date")
        .eq("user_id", userId!)
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch meal logs for this week
  const { data: weekMeals = [] } = useQuery({
    queryKey: ["weekly-meals-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_logs")
        .select("id, log_date")
        .eq("user_id", userId!)
        .gte("log_date", weekStart)
        .lte("log_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch transactions for this week
  const { data: weekTransactions = [] } = useQuery({
    queryKey: ["weekly-transactions-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId!)
        .gte("transaction_date", weekStart)
        .lte("transaction_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // XP this week
  const { data: weekXp = [] } = useQuery({
    queryKey: ["weekly-xp-tracker", userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("xp_logs")
        .select("amount, created_at")
        .eq("user_id", userId!)
        .gte("created_at", `${weekStart}T00:00:00`)
        .lte("created_at", `${weekEnd}T23:59:59`);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Compute scores
  const computed = useMemo(() => {
    // Rings: % of possible rings completed (5 per day * days elapsed)
    const totalPossibleRings = Math.max(1, (daysElapsed + 1) * 5);
    let totalRingsCompleted = 0;
    const todayStr = format(now, "yyyy-MM-dd");
    let ringsToday = 0;

    weekRings.forEach((r: any) => {
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
      .map((h: any) => h.recovery_score)
      .filter((v: any) => v != null) as number[];
    const recoveryAvg = recoveries.length > 0 ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : null;
    const sleepMins = weekHealth
      .map((h: any) => h.sleep_minutes)
      .filter((v: any) => v != null) as number[];
    const sleepAvg = sleepMins.length > 0 ? sleepMins.reduce((a, b) => a + b, 0) / sleepMins.length : null;
    const wearableScore = recoveryAvg ?? 50; // default 50 if no data

    // Planner: % of tasks completed
    const totalTasks = weekPlanner.length;
    const completedTasks = weekPlanner.filter((p: any) => p.status === "done").length;
    const plannerScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;

    // Nutrition: meals logged vs expected (3 per day)
    const expectedMeals = Math.max(1, (daysElapsed + 1) * 3);
    const nutritionScore = Math.min(100, (weekMeals.length / expectedMeals) * 100);

    // Money: tracked = good. Simple binary: logged > 0 = 100, 0 = 0
    const moneyScore = weekTransactions.length > 0 ? Math.min(100, 50 + weekTransactions.length * 5) : 0;

    const overallScore = (ringsScore + wearableScore + plannerScore + nutritionScore + moneyScore) / 5;

    // Days active = unique dates with any activity
    const activeDates = new Set<string>();
    weekRings.forEach((r: any) => activeDates.add(r.ring_date));
    weekPlanner.filter((p: any) => p.status === "done").forEach((p: any) => activeDates.add(p.scheduled_date));
    weekMeals.forEach((m: any) => activeDates.add(m.log_date));

    const totalXp = weekXp.reduce((sum: number, x: any) => sum + (x.amount || 0), 0);

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
  }, [trackingRow?.id, computed.scores.overall]);

  // Previous week for comparison
  const { data: previousWeek } = useQuery({
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
      return data;
    },
    enabled: !!userId,
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
