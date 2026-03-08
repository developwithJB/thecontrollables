import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface MealWeekComparisonProps {
  userId: string;
}

interface DayData {
  date: string;
  label: string;
  planned: number;
  actual: number;
}

export function MealWeekComparison({ userId }: MealWeekComparisonProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const { data: weekData } = useQuery({
    queryKey: ["meal-week-comparison", userId],
    queryFn: async (): Promise<DayData[]> => {
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        return format(d, "yyyy-MM-dd");
      });

      const [plansRes, logsRes] = await Promise.all([
        supabase
          .from("meal_plans")
          .select("plan_date, meals")
          .eq("user_id", userId)
          .gte("plan_date", dates[0])
          .lte("plan_date", dates[6]),
        supabase
          .from("meal_logs")
          .select("log_date, ai_analysis")
          .eq("user_id", userId)
          .gte("log_date", dates[0])
          .lte("log_date", dates[6]),
      ]);

      // Sum planned calories per date
      const plannedMap: Record<string, number> = {};
      for (const p of plansRes.data ?? []) {
        const meals = p.meals as any[];
        const cals = meals?.reduce((s: number, m: any) => s + (m.est_calories || 0), 0) ?? 0;
        plannedMap[p.plan_date] = (plannedMap[p.plan_date] || 0) + cals;
      }

      // Sum actual calories per date
      const actualMap: Record<string, number> = {};
      for (const l of logsRes.data ?? []) {
        const analysis = l.ai_analysis as any;
        const cals = analysis?.estimated_calories || 0;
        actualMap[l.log_date] = (actualMap[l.log_date] || 0) + cals;
      }

      return dates.map((d) => ({
        date: d,
        label: format(new Date(d + "T12:00:00"), "EEE"),
        planned: plannedMap[d] || 0,
        actual: actualMap[d] || 0,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (!weekData) return null;

  const maxCal = Math.max(...weekData.map((d) => Math.max(d.planned, d.actual)), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Plan vs Actual (7 days)</p>
      <div className="flex gap-1.5 items-end h-24">
        {weekData.map((day) => {
          const plannedH = (day.planned / maxCal) * 100;
          const actualH = (day.actual / maxCal) * 100;
          const ratio = day.planned > 0 ? day.actual / day.planned : 0;
          const color =
            day.actual === 0 && day.planned === 0
              ? "bg-muted"
              : ratio >= 0.85 && ratio <= 1.15
                ? "bg-green-500"
                : ratio >= 0.7 && ratio <= 1.3
                  ? "bg-yellow-500"
                  : "bg-red-500";

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-0.5 items-end h-20">
                {/* Planned */}
                <div
                  className="flex-1 bg-muted/60 rounded-t-sm"
                  style={{ height: `${plannedH}%`, minHeight: day.planned > 0 ? 4 : 0 }}
                />
                {/* Actual */}
                <div
                  className={cn("flex-1 rounded-t-sm", color)}
                  style={{ height: `${actualH}%`, minHeight: day.actual > 0 ? 4 : 0 }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{day.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-muted/60" /> Plan
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-500" /> On track
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-yellow-500" /> Off
        </span>
      </div>
    </div>
  );
}
