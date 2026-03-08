import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useMealTracking, type MealSlotConfig, type MealPlanMeal } from "@/hooks/useMealTracking";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Calendar, Share2 } from "lucide-react";
import { GroceryListSheet } from "./GroceryListSheet";
import { MealShareCard } from "./MealShareCard";

interface MealWeekComparisonProps {
  userId: string;
  slotConfig?: MealSlotConfig;
}

interface DayData {
  date: string;
  label: string;
  planned: number;
  actual: number;
  meals: MealPlanMeal[];
}

export function MealWeekComparison({ userId, slotConfig }: MealWeekComparisonProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const { generateWeekPlan } = useMealTracking(userId);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Fetch week plans (today + 6 future days for generation, past 6 + today for comparison)
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

      const plannedMap: Record<string, number> = {};
      const mealsMap: Record<string, MealPlanMeal[]> = {};
      for (const p of plansRes.data ?? []) {
        const meals = p.meals as any[];
        const cals = meals?.reduce((s: number, m: any) => s + (m.est_calories || 0), 0) ?? 0;
        plannedMap[p.plan_date] = (plannedMap[p.plan_date] || 0) + cals;
        mealsMap[p.plan_date] = meals as MealPlanMeal[];
      }

      const actualMap: Record<string, number> = {};
      for (const l of logsRes.data ?? []) {
        const analysis = l.ai_analysis as any;
        const cals = analysis?.estimated_calories || analysis?.calories || 0;
        actualMap[l.log_date] = (actualMap[l.log_date] || 0) + cals;
      }

      return dates.map((d) => ({
        date: d,
        label: format(new Date(d + "T12:00:00"), "EEE"),
        planned: plannedMap[d] || 0,
        actual: actualMap[d] || 0,
        meals: mealsMap[d] || [],
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch upcoming week plans (today + 6 days)
  const { data: upcomingPlans } = useQuery({
    queryKey: ["meal-week-plans", userId],
    queryFn: async () => {
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i);
        return format(d, "yyyy-MM-dd");
      });
      const { data, error } = await supabase
        .from("meal_plans")
        .select("plan_date, meals")
        .eq("user_id", userId)
        .gte("plan_date", dates[0])
        .lte("plan_date", dates[6]);
      if (error) throw error;

      const map: Record<string, MealPlanMeal[]> = {};
      for (const p of data ?? []) {
        map[p.plan_date] = p.meals as any as MealPlanMeal[];
      }
      return { dates, map };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const hasUpcomingPlans = upcomingPlans && Object.keys(upcomingPlans.map).length > 0;

  if (!weekData) return null;

  const maxCal = Math.max(...weekData.map((d) => Math.max(d.planned, d.actual)), 1);

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="flex-1">
          <GroceryListSheet userId={userId} />
        </div>
      </div>

      {/* Plan This Week button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full text-xs"
        onClick={() => generateWeekPlan.mutate(slotConfig)}
        disabled={generateWeekPlan.isPending}
      >
        {generateWeekPlan.isPending ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Planning week... (may take a moment)
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1" />
            {hasUpcomingPlans ? "Regenerate This Week" : "Plan This Week"}
          </>
        )}
      </Button>

      {/* Upcoming week breakdown (if plans exist) */}
      {hasUpcomingPlans && upcomingPlans && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Upcoming Plan</p>
          {upcomingPlans.dates.map((d) => {
            const meals = upcomingPlans.map[d] || [];
            const totalCal = meals.reduce((s, m) => s + (m.est_calories || 0), 0);
            const isExpanded = expandedDay === d;
            const dayLabel = format(new Date(d + "T12:00:00"), "EEE, MMM d");

            if (meals.length === 0) return null;

            return (
              <div key={d} className="rounded-lg border border-border/30 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : d)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent/30 transition-colors"
                >
                  <span className="font-medium text-foreground">{dayLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{totalCal} cal · {meals.length} meals</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {meals.map((meal, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          <span className="capitalize">{meal.meal_type.replace("_", " ")}</span>
                          {" · "}
                          <span className="text-foreground">{meal.name}</span>
                        </span>
                        <span>{meal.est_calories} cal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Past 7 day comparison chart */}
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
                  <div
                    className="flex-1 bg-muted/60 rounded-t-sm"
                    style={{ height: `${plannedH}%`, minHeight: day.planned > 0 ? 4 : 0 }}
                  />
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
    </div>
  );
}
