import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, Loader2, Lock, UtensilsCrossed, X, Minus, Plus, Settings2, Share2 } from "lucide-react";
import { MealShareCard } from "./MealShareCard";
import { MealPlanBuilder } from "./MealPlanBuilder";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "@/components/dashboard/ControllableLevelBadge";
import { MealWeekComparison } from "./MealWeekComparison";
import { Progress } from "@/components/ui/progress";

const wellnessTheme = getControllableTheme("wellness");
import { Button } from "@/components/ui/button";
import { useMealTracking, type MealSlotConfig, type MealPlanMeal } from "@/hooks/useMealTracking";
import { useMealPreferences } from "@/hooks/useMealPreferences";
import { MealTracker } from "./MealTracker";

interface MealPlanCardProps {
  userId: string | null;
  isPaid: boolean;
  onUpgrade?: () => void;
}

const MAIN_MEALS = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
];

export function MealPlanCard({ userId, isPaid, onUpgrade }: MealPlanCardProps) {
  const { todayPlan, generatePlan, updatePlanMeals, dailyTotals, todayMeals, addMealToPlanner } = useMealTracking(userId);
  const { preferences, savePreferences } = useMealPreferences(userId);
  const [showTracker, setShowTracker] = useState(false);
  const [view, setView] = useState<"today" | "week">("today");
  const [showConfig, setShowConfig] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Meal config state — initialized from saved preferences
  const [enabledMeals, setEnabledMeals] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
  });
  const [snackCount, setSnackCount] = useState(1);
  const [calorieTarget, setCalorieTarget] = useState<string>("");
  const [proteinTarget, setProteinTarget] = useState<string>("");
  const [carbsTarget, setCarbsTarget] = useState<string>("");
  const [fatTarget, setFatTarget] = useState<string>("");
  const [dietaryStyle, setDietaryStyle] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState("");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Sync from saved preferences once loaded
  useEffect(() => {
    if (prefsLoaded) return;
    if (preferences) {
      setEnabledMeals({
        breakfast: !preferences.excludeMeals.includes("breakfast"),
        lunch: !preferences.excludeMeals.includes("lunch"),
        dinner: !preferences.excludeMeals.includes("dinner"),
      });
      setSnackCount(preferences.snackCount);
      setCalorieTarget(preferences.calorieTarget ? String(preferences.calorieTarget) : "");
      setProteinTarget(preferences.proteinTarget ? String(preferences.proteinTarget) : "");
      setCarbsTarget(preferences.carbsTarget ? String(preferences.carbsTarget) : "");
      setFatTarget(preferences.fatTarget ? String(preferences.fatTarget) : "");
      setDietaryStyle(preferences.dietaryStyle || "");
      setDietaryRestrictions(preferences.dietaryRestrictions || []);
      setPrefsLoaded(true);
    }
  }, [preferences, prefsLoaded]);

  // Compute planned totals from today's meal plan
  const plannedTotals = useMemo(() => {
    if (!todayPlan?.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return (todayPlan.meals as any[]).reduce(
      (acc, m) => ({
        calories: acc.calories + (m.est_calories || 0),
        protein: acc.protein + (m.est_protein || 0),
        carbs: acc.carbs + (m.est_carbs || 0),
        fat: acc.fat + (m.est_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayPlan]);

  const hasTargets = !!(calorieTarget || proteinTarget || carbsTarget || fatTarget);
  const hasPlannedMacros = plannedTotals.protein > 0 || plannedTotals.carbs > 0 || plannedTotals.fat > 0;

  const hasMealsLogged = todayMeals.length > 0;

  const getSlotConfig = (): MealSlotConfig => {
    const excludeMeals = Object.entries(enabledMeals)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    return { excludeMeals, snackCount };
  };

  const handleGenerate = () => {
    const config = getSlotConfig();
    const calTarget = calorieTarget ? parseInt(calorieTarget) : undefined;
    const macros = {
      proteinTarget: proteinTarget ? parseInt(proteinTarget) : undefined,
      carbsTarget: carbsTarget ? parseInt(carbsTarget) : undefined,
      fatTarget: fatTarget ? parseInt(fatTarget) : undefined,
    };
    generatePlan.mutate({
      ...config,
      calorie_target: calTarget,
      macro_targets: macros,
      dietary_style: dietaryStyle || undefined,
      dietary_restrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
    });
    savePreferences.mutate({
      excludeMeals: config.excludeMeals || [],
      snackCount: config.snackCount ?? 1,
      calorieTarget: calTarget,
      ...macros,
      dietaryStyle,
      dietaryRestrictions,
    });
    setShowConfig(false);
  };

  const handleRemoveMeal = (index: number) => {
    if (!todayPlan) return;
    const meals = (todayPlan.meals as any[]).filter((_: any, i: number) => i !== index);
    updatePlanMeals.mutate({ planId: todayPlan.id, meals });
  };

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
      <div className={`rounded-2xl border border-border/60 bg-card p-4 space-y-3 ${wellnessTheme.borderClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{wellnessTheme.emoji}</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fuel Check</h3>
              <ControllableLevelBadge controllable="wellness" />
              {hasMealsLogged && view === "today" && (
                <p className="text-[11px] text-muted-foreground">
                  {dailyTotals.calories} cal logged today
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-md border border-border/60 text-[10px] overflow-hidden">
              <button
                onClick={() => setView("today")}
                className={`px-2 py-0.5 transition-colors ${view === "today" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Today
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-2 py-0.5 transition-colors ${view === "week" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Week
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowTracker(true)}
            >
              <UtensilsCrossed className="w-3 h-3 mr-1" />
              Log
            </Button>
          </div>
        </div>

        {/* Content: Today or Week view */}
        {view === "week" && userId ? (
          <MealWeekComparison userId={userId} slotConfig={getSlotConfig()} />
        ) : showConfig ? (
          /* Meal config panel */
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Choose your meals</p>
            
            {/* Main meal toggles */}
            <div className="flex flex-wrap gap-1.5">
              {MAIN_MEALS.map((meal) => (
                <button
                  key={meal.key}
                  onClick={() =>
                    setEnabledMeals((prev) => ({ ...prev, [meal.key]: !prev[meal.key] }))
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    enabledMeals[meal.key]
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border/40 text-muted-foreground line-through"
                  }`}
                >
                  <span>{meal.emoji}</span>
                  {meal.label}
                </button>
              ))}
            </div>

            {/* Snack stepper */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">🍎 Snacks</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSnackCount((c) => Math.max(0, c - 1))}
                  disabled={snackCount === 0}
                  className="w-6 h-6 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-mono w-4 text-center text-foreground">{snackCount}</span>
                <button
                  onClick={() => setSnackCount((c) => Math.min(5, c + 1))}
                  disabled={snackCount >= 5}
                  className="w-6 h-6 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Dietary Style */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Dietary style</p>
              <div className="flex flex-wrap gap-1.5">
                {["", "Whole Foods", "Single Ingredient", "Clean Eating"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setDietaryStyle(style)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      dietaryStyle === style
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/50 border-border/40 text-muted-foreground"
                    }`}
                  >
                    {style || "No Preference"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Restrictions</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder='e.g. "no lunch meat"'
                  value={restrictionInput}
                  onChange={(e) => setRestrictionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && restrictionInput.trim()) {
                      setDietaryRestrictions((prev) => [...prev, restrictionInput.trim()]);
                      setRestrictionInput("");
                    }
                  }}
                  className="flex-1 h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={() => {
                    if (restrictionInput.trim()) {
                      setDietaryRestrictions((prev) => [...prev, restrictionInput.trim()]);
                      setRestrictionInput("");
                    }
                  }}
                  className="h-7 px-2.5 text-xs font-medium rounded-md border border-border/60 bg-muted/50 text-foreground hover:bg-muted transition-colors"
                >
                  Add
                </button>
              </div>
              {dietaryRestrictions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dietaryRestrictions.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-destructive/10 text-destructive border border-destructive/20"
                    >
                      {r}
                      <button
                        onClick={() => setDietaryRestrictions((prev) => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-destructive/80"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Calorie & Macro Targets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Daily targets <span className="font-normal">(optional)</span></p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Calories</label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={calorieTarget}
                    onChange={(e) => setCalorieTarget(e.target.value)}
                    className="w-full h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={proteinTarget}
                    onChange={(e) => setProteinTarget(e.target.value)}
                    className="w-full h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="200"
                    value={carbsTarget}
                    onChange={(e) => setCarbsTarget(e.target.value)}
                    className="w-full h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="65"
                    value={fatTarget}
                    onChange={(e) => setFatTarget(e.target.value)}
                    className="w-full h-7 px-2 text-xs rounded-md border border-border/60 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleGenerate}
                disabled={generatePlan.isPending || (!enabledMeals.breakfast && !enabledMeals.lunch && !enabledMeals.dinner && snackCount === 0)}
              >
                {generatePlan.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Planning...</>
                ) : (
                  <><Sparkles className="w-3 h-3 mr-1" /> Generate</>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : todayPlan && (todayPlan.meals as any[]).length > 0 ? (
          <div className="space-y-2">
            {(todayPlan.meals as any[]).map((meal: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0 group">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize w-16">{meal.meal_type.replace("_", " ")}</span>
                  <span className="text-foreground">{meal.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{meal.est_calories} cal</span>
                  <button
                    onClick={() => handleRemoveMeal(i)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-opacity"
                    title="Remove meal"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}

            {/* Macro Breakdown Summary */}
            {(hasTargets || hasPlannedMacros) && (
              <div className="rounded-lg border border-border/40 bg-muted/30 p-2.5 space-y-2 mt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Daily Macro Breakdown</p>
                {[
                  { label: "Calories", planned: plannedTotals.calories, target: calorieTarget ? parseInt(calorieTarget) : 0, unit: "cal", color: "bg-primary" },
                  { label: "Protein", planned: plannedTotals.protein, target: proteinTarget ? parseInt(proteinTarget) : 0, unit: "g", color: "bg-chart-1" },
                  { label: "Carbs", planned: plannedTotals.carbs, target: carbsTarget ? parseInt(carbsTarget) : 0, unit: "g", color: "bg-chart-2" },
                  { label: "Fat", planned: plannedTotals.fat, target: fatTarget ? parseInt(fatTarget) : 0, unit: "g", color: "bg-chart-3" },
                ].map((row) => {
                  if (!row.target && !row.planned) return null;
                  const pct = row.target > 0 ? Math.min(Math.round((row.planned / row.target) * 100), 150) : 100;
                  const overTarget = row.target > 0 && row.planned > row.target;
                  return (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-medium ${overTarget ? "text-destructive" : "text-foreground"}`}>
                          {row.planned}{row.unit}
                          {row.target > 0 && (
                            <span className="text-muted-foreground font-normal"> / {row.target}{row.unit}</span>
                          )}
                        </span>
                      </div>
                      {row.target > 0 && (
                        <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${overTarget ? "bg-destructive" : row.color}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                className="text-[11px] h-8 gap-1.5 font-medium"
                onClick={() => {
                  if (todayPlan?.meals) {
                    const meals = todayPlan.meals as MealPlanMeal[];
                    meals.forEach((meal) => {
                      addMealToPlanner.mutate({ meal });
                    });
                  }
                }}
                disabled={addMealToPlanner.isPending}
              >
                <Calendar className="w-3.5 h-3.5" />
                Add to Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground"
                onClick={() => setShowShare(true)}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground"
                onClick={() => setShowConfig(true)}
              >
                <Settings2 className="w-3 h-3 mr-1" />
                Edit meals
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 text-muted-foreground"
                onClick={handleGenerate}
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
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowBuilder(true)}
              disabled={generatePlan.isPending}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate Today's Meal Plan
            </Button>
          </div>
        )}
      </div>

      {/* Meal Tracker Bottom Sheet */}
      <MealTracker isOpen={showTracker} onClose={() => setShowTracker(false)} userId={userId} />

      {/* Share Card */}
      {todayPlan && (
        <MealShareCard
          open={showShare}
          onOpenChange={setShowShare}
          meals={(todayPlan.meals as any[]) || []}
          totalCalories={plannedTotals.calories}
        />
      )}

      {/* Collaborative Meal Plan Builder */}
      <MealPlanBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        userId={userId}
        slotConfig={getSlotConfig()}
        onConfirm={(meals) => {
          updatePlanMeals.mutate({
            planId: todayPlan?.id || "new",
            meals,
          });
        }}
        isGenerating={generatePlan.isPending}
        onGenerate={async (config: any) => {
          return new Promise((resolve, reject) => {
            generatePlan.mutate(config, {
              onSuccess: (data) => resolve(data),
              onError: (err) => reject(err),
            });
          });
        }}
      />
    </>
  );
}
