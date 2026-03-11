import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, Clock, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMealTracking, type MealSlotConfig } from "@/hooks/useMealTracking";
import { useMealPreferences } from "@/hooks/useMealPreferences";
import { MealPlanBuilder } from "@/components/nutrition/MealPlanBuilder";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";

import type { FuelIntelligence } from "@/lib/fuelIntelligence";

interface FuelTodayCardProps {
  userId: string | null;
  isPaid: boolean;
  fuelIntel?: FuelIntelligence | null;
}

export function FuelTodayCard({ userId, isPaid, fuelIntel }: FuelTodayCardProps) {
  const navigate = useNavigate();
  const { todayPlan, planLoading, generatePlan, updatePlanMeals } = useMealTracking(userId);
  const { preferences } = useMealPreferences(userId);
  const [showBuilder, setShowBuilder] = useState(false);

  // Check if grocery list has been generated this week
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: weekMealPlans } = useQuery({
    queryKey: ["week-meal-plans-grocery-check", userId, weekStart],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("meal_plans")
        .select("id, meals")
        .eq("user_id", userId)
        .gte("plan_date", weekStart)
        .lte("plan_date", weekEnd);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const hasPlannedMeals = (weekMealPlans?.length ?? 0) > 0;
  const totalWeekMeals = weekMealPlans?.reduce((sum, p) => sum + ((p.meals as any[])?.length || 0), 0) ?? 0;
  const showGroceryGap = hasPlannedMeals && totalWeekMeals >= 3;

  const slotConfig: MealSlotConfig = useMemo(() => ({
    excludeMeals: preferences?.excludeMeals || [],
    snackCount: preferences?.snackCount ?? 1,
  }), [preferences]);

  if (planLoading || !isPaid) return null;

  const meals = (todayPlan?.meals as any[]) || [];
  const dinner = meals.find((m: any) => m.meal_type === "dinner");
  const nextUnplanned = !meals.find((m: any) => m.meal_type === "breakfast")
    ? "breakfast"
    : !meals.find((m: any) => m.meal_type === "lunch")
    ? "lunch"
    : !dinner
    ? "dinner"
    : null;

  const handleBuilderConfirm = (confirmedMeals: any[]) => {
    if (todayPlan) {
      updatePlanMeals.mutate({ planId: todayPlan.id, meals: confirmedMeals });
    }
    setShowBuilder(false);
  };

  const handleGenerate = async (config: any) => {
    return generatePlan.mutateAsync(config);
  };

  const builderEl = (
    <MealPlanBuilder
      open={showBuilder}
      onClose={() => setShowBuilder(false)}
      userId={userId}
      slotConfig={slotConfig}
      onConfirm={handleBuilderConfirm}
      isGenerating={generatePlan.isPending}
      onGenerate={handleGenerate}
    />
  );

  // No plan at all — show a compact CTA
  if (meals.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-border/50 bg-card/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🍽️</span>
              <div>
                <p className="text-xs font-medium text-foreground">No meals planned today</p>
                <p className="text-[10px] text-muted-foreground">Reduce decision fatigue — plan your fuel</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setShowBuilder(true)}
            >
              <Sparkles className="w-3 h-3" /> Plan
            </Button>
          </div>
        </div>
        {builderEl}
      </>
    );
  }

  // Has a plan — show tonight's meal + quick actions
  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🍽️</span>
            <h3 className="text-xs font-semibold text-foreground">Fuel Today</h3>
          </div>
          <button
            onClick={() => navigate("/wellness")}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            Full plan <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Fuel intelligence context line */}
        {fuelIntel?.dinnerAdvice && (
          <div className="flex items-start gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
            <span className="text-xs shrink-0 mt-px">
              {fuelIntel.mealFit === "recovery_friendly" ? "🔋" : fuelIntel.mealFit === "high_protein" ? "💪" : fuelIntel.mealFit === "quick_easy" ? "⚡" : fuelIntel.mealFit === "prep_friendly" ? "🍳" : "✨"}
            </span>
            <p className="text-[10px] text-muted-foreground">{fuelIntel.dinnerAdvice}</p>
          </div>
        )}

        {/* Tonight's meal */}
        {dinner ? (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🌙</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{dinner.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  ~{dinner.est_calories} cal
                  {dinner.est_protein ? ` · ${dinner.est_protein}g protein` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-muted-foreground"
              onClick={() => setShowBuilder(true)}
            >
              Swap
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-2.5 py-1.5">
            <p className="text-xs text-muted-foreground">No dinner planned</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2"
              onClick={() => setShowBuilder(true)}
            >
              <Sparkles className="w-2.5 h-2.5 mr-1" /> Suggest
            </Button>
          </div>
        )}

        {/* Grocery gap warning */}
        {showGroceryGap && (
          <div className="flex items-center gap-1.5 bg-accent/10 rounded-md px-2 py-1">
            <AlertTriangle className="w-3 h-3 text-accent shrink-0" />
            <p className="text-[10px] text-accent">
              Ingredients not confirmed — generate your grocery list
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-5 px-1.5 text-accent ml-auto"
              onClick={() => navigate("/wellness")}
            >
              Open
            </Button>
          </div>
        )}

        {/* Summary row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <UtensilsCrossed className="w-2.5 h-2.5" />
            {meals.length} meals planned
          </span>
          {nextUnplanned && (
            <span className="flex items-center gap-1 text-accent">
              <Clock className="w-2.5 h-2.5" />
              {nextUnplanned} needs a decision
            </span>
          )}
        </div>
      </div>

      {builderEl}
    </>
  );
}
