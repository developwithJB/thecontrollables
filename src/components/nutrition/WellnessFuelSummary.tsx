import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WellnessFuelSummaryProps {
  userId: string | null;
}

export function WellnessFuelSummary({ userId }: WellnessFuelSummaryProps) {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("sv-SE");

  const { data: todayPlan } = useQuery({
    queryKey: ["meal-plan", userId, today],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("plan_date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const meals = (todayPlan?.meals as any[]) || [];
  const totalCal = meals.reduce((s: number, m: any) => s + (m.est_calories || 0), 0);

  if (meals.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛰️</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fuel Check</h3>
              <p className="text-xs text-muted-foreground">No meals planned for today</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => navigate("/planner")}
          >
            Plan <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛰️</span>
          <h3 className="text-sm font-semibold text-foreground">Today's Fuel</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Flame className="w-3 h-3" /> {totalCal} cal planned
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1 text-muted-foreground"
            onClick={() => navigate("/planner")}
          >
            Edit <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {meals.map((meal: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground capitalize w-14">{meal.meal_type}</span>
              <span className="text-foreground">{meal.name}</span>
            </div>
            <span className="text-muted-foreground">{meal.est_calories} cal</span>
          </div>
        ))}
      </div>
    </div>
  );
}
