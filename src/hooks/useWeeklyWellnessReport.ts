import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, subWeeks, eachDayOfInterval } from "date-fns";

export interface WeeklyWellnessReport {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  avgSleep: number;
  avgMovement: number;
  avgNutrition: number;
  overallAvg: number;
  trend: "up" | "down" | "steady";
  prevOverallAvg: number;
  dailyData: { date: string; sleep: number; movement: number; nutrition: number }[];
}

export function useWeeklyWellnessReport(userId: string | undefined) {
  const [report, setReport] = useState<WeeklyWellnessReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      const [{ data: thisWeek }, { data: lastWeek }] = await Promise.all([
        supabase
          .from("wellness_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("log_date", format(weekStart, "yyyy-MM-dd"))
          .lte("log_date", format(weekEnd, "yyyy-MM-dd"))
          .order("log_date"),
        supabase
          .from("wellness_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("log_date", format(prevWeekStart, "yyyy-MM-dd"))
          .lte("log_date", format(prevWeekEnd, "yyyy-MM-dd")),
      ]);

      const logs = thisWeek || [];
      const prevLogs = lastWeek || [];

      const avg = (arr: (number | null)[]) => {
        const valid = arr.filter((v): v is number => v !== null);
        return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
      };

      const avgSleep = avg(logs.map((l) => l.sleep_rating));
      const avgMovement = avg(logs.map((l) => l.movement_rating));
      const avgNutrition = avg(logs.map((l) => l.nutrition_rating));
      const overallAvg = (avgSleep + avgMovement + avgNutrition) / 3;

      const prevAvgSleep = avg(prevLogs.map((l) => l.sleep_rating));
      const prevAvgMovement = avg(prevLogs.map((l) => l.movement_rating));
      const prevAvgNutrition = avg(prevLogs.map((l) => l.nutrition_rating));
      const prevOverallAvg = (prevAvgSleep + prevAvgMovement + prevAvgNutrition) / 3;

      const diff = overallAvg - prevOverallAvg;
      const trend: "up" | "down" | "steady" = diff > 0.3 ? "up" : diff < -0.3 ? "down" : "steady";

      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const dailyData = days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const log = logs.find((l) => l.log_date === dateStr);
        return {
          date: format(d, "EEE"),
          sleep: log?.sleep_rating ?? 0,
          movement: log?.movement_rating ?? 0,
          nutrition: log?.nutrition_rating ?? 0,
        };
      });

      setReport({
        weekStart: format(weekStart, "MMM d"),
        weekEnd: format(weekEnd, "MMM d"),
        daysLogged: logs.length,
        avgSleep: Math.round(avgSleep * 10) / 10,
        avgMovement: Math.round(avgMovement * 10) / 10,
        avgNutrition: Math.round(avgNutrition * 10) / 10,
        overallAvg: Math.round(overallAvg * 10) / 10,
        trend,
        prevOverallAvg: Math.round(prevOverallAvg * 10) / 10,
        dailyData,
      });
    } catch (err) {
      console.error("Error fetching weekly wellness report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, isLoading, refetch: fetchReport };
}
