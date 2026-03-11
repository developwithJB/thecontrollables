import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingDown, CheckCircle2, Calendar } from "lucide-react";

interface GroceryRhythmCardProps {
  userId: string | null;
  plannerCount?: number;
  recoveryLow?: boolean;
}

export function GroceryRhythmCard({ userId, plannerCount, recoveryLow }: GroceryRhythmCardProps) {
  // Count meals planned this week
  const { data: weekMealCount = 0 } = useQuery({
    queryKey: ["meal-week-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data } = await supabase
        .from("meal_plans")
        .select("meals")
        .eq("user_id", userId)
        .gte("plan_date", weekStart.toLocaleDateString("sv-SE"))
        .lte("plan_date", weekEnd.toLocaleDateString("sv-SE"));

      if (!data) return 0;
      return data.reduce((sum, row) => sum + ((row.meals as any[])?.length || 0), 0);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const hasPlannedMeals = weekMealCount > 0;
  const takeoutRisk = weekMealCount < 5;
  const heavyScheduleRisk = plannerCount !== undefined && plannerCount > 6 && weekMealCount < 3;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Grocery Rhythm</h3>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Meals planned this week</span>
        <span className="font-medium text-foreground">{weekMealCount}</span>
      </div>

      {/* Calendar-aware spending risk */}
      {heavyScheduleRisk && (
        <div className="flex items-start gap-2 rounded-lg bg-orange-500/5 border border-orange-500/10 px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Heavy schedule + few meals planned — convenience spending risk is higher this week.
          </p>
        </div>
      )}

      {takeoutRisk && !heavyScheduleRisk ? (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
          <TrendingDown className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            {weekMealCount === 0
              ? "No meals planned — takeout risk is higher this week."
              : "Few meals planned — unplanned days tend to increase takeout spending."}
          </p>
        </div>
      ) : !heavyScheduleRisk ? (
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            {weekMealCount} meals planned — meal planning reduces random spending and supports healthier choices.
          </p>
        </div>
      ) : null}
    </div>
  );
}
