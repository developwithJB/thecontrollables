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
  hasHealthSync: boolean;
  isLoading: boolean;
}

function ratingToScore(rating: number | null, max = 5): number {
  if (rating === null || rating === undefined) return -1;
  return Math.round((rating / max) * 100);
}

function screenTimeToScore(wastedMinutes: number | null): number {
  if (wastedMinutes === null || wastedMinutes === undefined) return -1;
  return Math.max(0, Math.min(100, Math.round(100 - (wastedMinutes / 180) * 100)));
}

function weightedAvg(values: { score: number; weight: number }[]): number {
  const valid = values.filter((v) => v.score >= 0);
  if (valid.length === 0) return -1;
  const totalWeight = valid.reduce((s, v) => s + v.weight, 0);
  return Math.round(valid.reduce((s, v) => s + v.score * (v.weight / totalWeight), 0));
}

// Convert health sync steps/active_minutes to a 0-100 movement score
function stepsToMovementScore(steps: number | null, activeMinutes: number | null): number {
  if (steps === null && activeMinutes === null) return -1;
  // 10k steps = 100, active 60 min = 100, blend if both present
  const stepScore = steps !== null ? Math.min(100, Math.round((steps / 10000) * 100)) : -1;
  const activeScore = activeMinutes !== null ? Math.min(100, Math.round((activeMinutes / 60) * 100)) : -1;
  if (stepScore >= 0 && activeScore >= 0) return Math.round((stepScore + activeScore) / 2);
  return stepScore >= 0 ? stepScore : activeScore;
}

// Convert sleep_minutes to 0-100 score (7-9 hours optimal)
function sleepMinutesToScore(minutes: number | null): number {
  if (minutes === null || minutes <= 0) return -1;
  const hours = minutes / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours < 7) return Math.max(0, Math.round((hours / 7) * 100));
  // > 9 hours slight penalty
  return Math.max(60, Math.round(100 - ((hours - 9) / 3) * 40));
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

  // Health sync data from Apple Health / Google Fit
  const { data: healthSyncData, isLoading: hsLoading } = useQuery({
    queryKey: ["brain-body-health-sync", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("steps, sleep_minutes, active_minutes, heart_rate_avg, sync_date, recovery_score, hrv_ms, strain_score")
        .eq("user_id", userId!)
        .gte("sync_date", sevenDaysAgo)
        .order("sync_date", { ascending: false })
        .limit(7);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const result = useMemo((): Omit<BrainBodyHealth, "isLoading"> => {
    const wl = wellnessLogs || [];
    const tl = timeLogs || [];
    const ml = mealLogs || [];
    const hs = healthSyncData || [];

    const hasHealthSync = hs.length > 0;

    if (wl.length === 0 && tl.length === 0 && ml.length === 0 && hs.length === 0) {
      return {
        brainScore: 0,
        bodyScore: 0,
        factors: { sleep: 0, movement: 0, screenTime: 0, nutrition: 0 },
        trend: "stable",
        hasData: false,
        hasHealthSync: false,
      };
    }

    // --- Sleep score: prefer health sync data, fallback to wellness rating ---
    const hsSleepScores = hs
      .map((h) => sleepMinutesToScore(h.sleep_minutes))
      .filter((s) => s >= 0);
    const wlSleepScores = wl
      .map((l) => ratingToScore(l.sleep_rating))
      .filter((s) => s >= 0);
    const sleepScore = hsSleepScores.length > 0
      ? Math.round(hsSleepScores.reduce((a, b) => a + b, 0) / hsSleepScores.length)
      : wlSleepScores.length > 0
        ? Math.round(wlSleepScores.reduce((a, b) => a + b, 0) / wlSleepScores.length)
        : -1;

    // --- Movement score: prefer health sync, fallback to wellness rating ---
    const hsMovementScores = hs
      .map((h) => stepsToMovementScore(h.steps, h.active_minutes))
      .filter((s) => s >= 0);
    const wlMovementScores = wl
      .map((l) => ratingToScore(l.movement_rating))
      .filter((s) => s >= 0);
    const movementScore = hsMovementScores.length > 0
      ? Math.round(hsMovementScores.reduce((a, b) => a + b, 0) / hsMovementScores.length)
      : wlMovementScores.length > 0
        ? Math.round(wlMovementScores.reduce((a, b) => a + b, 0) / wlMovementScores.length)
        : -1;

    // --- Screen time score (no health sync equivalent) ---
    const avgWasted = tl.length > 0
      ? tl.reduce((s, l) => s + (l.time_wasted_minutes || 0), 0) / tl.length
      : -1;
    const screenScore = screenTimeToScore(avgWasted >= 0 ? avgWasted : null);

    // --- Nutrition score ---
    const avgNutrition = wl.length > 0
      ? wl.reduce((s, l) => s + (l.nutrition_rating || 0), 0) / (wl.filter((l) => l.nutrition_rating).length || 1)
      : 0;
    const analyzedMeals = ml.filter((m) => m.ai_analysis);
    const mealNutritionBoost = analyzedMeals.length > 0 ? 10 : 0;
    const nutritionBase = ratingToScore(avgNutrition > 0 ? avgNutrition : null);
    const nutritionScore = nutritionBase >= 0
      ? Math.min(100, nutritionBase + mealNutritionBoost)
      : mealNutritionBoost > 0 ? 60 : -1;

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

    // Trend
    let trend: "up" | "down" | "stable" = "stable";
    const trendSource = hs.length >= 4 ? hs : wl.length >= 4 ? wl : null;
    if (trendSource && trendSource.length >= 4) {
      const half = Math.floor(trendSource.length / 2);
      if ("sleep_minutes" in trendSource[0]) {
        // health sync trend
        const recent = (trendSource as typeof hs).slice(0, half);
        const older = (trendSource as typeof hs).slice(half);
        const recentAvg = recent.reduce((s, h) => s + (h.steps || 0) + (h.sleep_minutes || 0), 0) / (half || 1);
        const olderAvg = older.reduce((s, h) => s + (h.steps || 0) + (h.sleep_minutes || 0), 0) / (older.length || 1);
        if (recentAvg > olderAvg * 1.05) trend = "up";
        else if (recentAvg < olderAvg * 0.95) trend = "down";
      } else {
        const recent = (trendSource as typeof wl).slice(0, half);
        const older = (trendSource as typeof wl).slice(half);
        const recentAvg = recent.reduce((s, l) => s + (l.sleep_rating || 0) + (l.movement_rating || 0), 0) / (half * 2);
        const olderAvg = older.reduce((s, l) => s + (l.sleep_rating || 0) + (l.movement_rating || 0), 0) / (older.length * 2);
        if (recentAvg > olderAvg + 0.3) trend = "up";
        else if (recentAvg < olderAvg - 0.3) trend = "down";
      }
    }

    // Only report hasData if at least one composite score is positive
    const actuallyHasData = brainScore > 0 || bodyScore > 0;

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
      hasData: actuallyHasData,
      hasHealthSync,
    };
  }, [wellnessLogs, timeLogs, mealLogs, healthSyncData]);

  return {
    ...result,
    isLoading: wlLoading || tlLoading || mlLoading || hsLoading,
  };
}
