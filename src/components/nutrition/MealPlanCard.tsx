import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, Loader2, Lock, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMealTracking } from "@/hooks/useMealTracking";
import { MealTracker } from "./MealTracker";

interface MealPlanCardProps {
  userId: string | null;
  isPaid: boolean;
  onUpgrade?: () => void;
}

export function MealPlanCard({ userId, isPaid, onUpgrade }: MealPlanCardProps) {
  const { todayPlan, generatePlan, dailyTotals, todayMeals } = useMealTracking(userId);
  const [showTracker, setShowTracker] = useState(false);

  const hasMealsLogged = todayMeals.length > 0;

  // Build Google Calendar URL for meal prep
  const getCalendarUrl = () => {
    if (!todayPlan?.meals) return "";
    const mealSummary = (todayPlan.meals as any[])
      .map((m: any) => `${m.meal_type}: ${m.name} (~${m.est_calories} cal)`)
      .join("\\n");
    const title = encodeURIComponent("🛰️ Meal Prep Plan");
    const details = encodeURIComponent(mealSummary);
    const now = new Date();
    const startStr = `${now.toISOString().slice(0, 10).replace(/-/g, "")}T070000`;
    const endStr = `${now.toISOString().slice(0, 10).replace(/-/g, "")}T073000`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startStr}/${endStr}`;
  };

  // Locked state for free users
  if (!isPaid) {
    return (
      <div className="relative rounded-2xl border border-border/60 bg-card p-4 overflow-hidden">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center px-4">
            Unlock AI meal planning with Plus
          </p>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={onUpgrade}>
            Upgrade
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🛰️</span>
          <h3 className="text-sm font-semibold text-foreground">Fuel Check</h3>
        </div>
        <p className="text-xs text-muted-foreground">AI-powered meal tracking & planning</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛰️</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fuel Check</h3>
              {hasMealsLogged && (
                <p className="text-[11px] text-muted-foreground">
                  {dailyTotals.calories} cal logged today
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowTracker(true)}
          >
            <UtensilsCrossed className="w-3 h-3 mr-1" />
            Log Meal
          </Button>
        </div>

        {/* Meal Plan */}
        {todayPlan ? (
          <div className="space-y-2">
            {(todayPlan.meals as any[]).map((meal: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize w-16">{meal.meal_type}</span>
                  <span className="text-foreground">{meal.name}</span>
                </div>
                <span className="text-muted-foreground">{meal.est_calories} cal</span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground"
                onClick={() => window.open(getCalendarUrl(), "_blank")}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Add to Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground"
                onClick={() => generatePlan.mutate()}
                disabled={generatePlan.isPending}
              >
                {generatePlan.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
          >
            {generatePlan.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Satellite is planning...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Today's Meal Plan
              </>
            )}
          </Button>
        )}
      </div>

      {/* Meal Tracker Bottom Sheet */}
      <MealTracker isOpen={showTracker} onClose={() => setShowTracker(false)} userId={userId} />
    </>
  );
}
