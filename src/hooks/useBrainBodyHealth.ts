import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HealthFactors {
  sleep: number;      // 0-100
  movement: number;   // 0-100
  screenTime: number; // 0-100 (higher = less wasted time)
  nutrition: number;  // 0-100
}

interface BrainBodyHealth {
  brainScore: number;
  bodyScore: number;
  factors: HealthFactors;
  trend: "up" | "down" | "stable";
  hasData: boolean;
  isLoading: boolean;
}

function ratingToScore(rating: number | null, max = 5): number {
  if (rating === null || rating === undefined) return -1;
  return Math.round((rating / max) * 100);
}

function screenTimeToScore(wastedMinutes: number | null): number {
  if (wastedMinutes === null || wastedMinutes === undefined) return -1;
  // 0 min wasted = 100, 180+ min wasted = 0
  return Math.max(0, Math.min(100, Math.round(100 - (wastedMinutes / 180) * 100)));
}

function weightedAvg(values: { score: number; weight: number }[]): number {
  const valid = values.filter((v) => v.score >= 0);
  if (valid.length === 0) return -1;
  const totalWeight = valid.reduce((s, v) => s + v.weight, 0);
  return Math.round(valid.reduce((s, v) => s + v.score * (v.weight / totalWeight), 0));
}

export function useBrainBodyHealth(userId: string | undefined): BrainBodyHealth {
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: wellnessLogs, isLoading: wlLoading } = useQuery({
    queryKey: ["brain-body-wellness", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wellness_logs")
        .select("sleep_rating, movement_rating, nutrition_rating, log_date")
        .eq("user_id", userId!)
        .gte("log_date", sevenDaysAgo)
        .order("log_date", { ascending: false })
        .limit(7);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: timeLogs, isLoading: tlLoading } = useQuery({
    queryKey: ["brain-body-time", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_logs")
        .select("time_wasted_minutes, log_date")
        .eq("user_id", userId!)
        .gte("log_date", sevenDaysAgo)
        .order("log_date", { ascending: false })
        .limit(7);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: mealLogs, isLoading: mlLoading } = useQuery({
    queryKey: ["brain-body-meals", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_logs")
        .select("ai_analysis, log_date")
        .eq("user_id", userId!)
        .gte("log_date", sevenDaysAgo)
        .order("log_date", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const result = useMemo((): Omit<BrainBodyHealth, "isLoading"> => {
    const wl = wellnessLogs || [];
    const tl = timeLogs || [];
    const ml = mealLogs || [];

    if (wl.length === 0 && tl.length === 0 && ml.length === 0) {
      return {
        brainScore: 0,
        bodyScore: 0,
        factors: { sleep: 0, movement: 0, screenTime: 0, nutrition: 0 },
        trend: "stable",
        hasData: false,
      };
    }

    // Average wellness ratings
    const avgSleep = wl.length > 0
      ? wl.reduce((s, l) => s + (l.sleep_rating || 0), 0) / wl.filter((l) => l.sleep_rating).length || 0
      : 0;
    const avgMovement = wl.length > 0
      ? wl.reduce((s, l) => s + (l.movement_rating || 0), 0) / wl.filter((l) => l.movement_rating).length || 0
      : 0;
    const avgNutrition = wl.length > 0
      ? wl.reduce((s, l) => s + (l.nutrition_rating || 0), 0) / wl.filter((l) => l.nutrition_rating).length || 0
      : 0;

    // Average screen time
    const avgWasted = tl.length > 0
      ? tl.reduce((s, l) => s + (l.time_wasted_minutes || 0), 0) / tl.length
      : -1;

    // Meal-based nutrition boost (if they have meal logs with analysis)
    const analyzedMeals = ml.filter((m) => m.ai_analysis);
    const mealNutritionBoost = analyzedMeals.length > 0 ? 10 : 0; // small bonus for tracking

    const sleepScore = ratingToScore(avgSleep > 0 ? avgSleep : null);
    const movementScore = ratingToScore(avgMovement > 0 ? avgMovement : null);
    const screenScore = screenTimeToScore(avgWasted >= 0 ? avgWasted : null);
    const nutritionBase = ratingToScore(avgNutrition > 0 ? avgNutrition : null);
    const nutritionScore = nutritionBase >= 0
      ? Math.min(100, nutritionBase + mealNutritionBoost)
      : mealNutritionBoost > 0 ? 60 : -1; // default 60 if only meal logs exist

    const brainScore = Math.max(0, weightedAvg([
      { score: sleepScore, weight: 0.4 },
      { score: screenScore, weight: 0.3 },
      { score: nutritionScore, weight: 0.3 },
    ]));

    const bodyScore = Math.max(0, weightedAvg([
      { score: movementScore, weight: 0.4 },
      { score: sleepScore, weight: 0.3 },
      { score: nutritionScore, weight: 0.3 },
    ]));

    // Trend: compare first half vs second half of wellness logs
    let trend: "up" | "down" | "stable" = "stable";
    if (wl.length >= 4) {
      const half = Math.floor(wl.length / 2);
      const recentAvg = wl.slice(0, half).reduce((s, l) => s + (l.sleep_rating || 0) + (l.movement_rating || 0), 0) / (half * 2);
      const olderAvg = wl.slice(half).reduce((s, l) => s + (l.sleep_rating || 0) + (l.movement_rating || 0), 0) / ((wl.length - half) * 2);
      if (recentAvg > olderAvg + 0.3) trend = "up";
      else if (recentAvg < olderAvg - 0.3) trend = "down";
    }

    return {
      brainScore,
      bodyScore,
      factors: {
        sleep: Math.max(0, sleepScore),
        movement: Math.max(0, movementScore),
        screenTime: Math.max(0, screenScore),
        nutrition: Math.max(0, nutritionScore),
      },
      trend,
      hasData: true,
    };
  }, [wellnessLogs, timeLogs, mealLogs]);

  return {
    ...result,
    isLoading: wlLoading || tlLoading || mlLoading,
  };
}
