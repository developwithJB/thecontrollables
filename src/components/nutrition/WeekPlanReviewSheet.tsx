import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MealSwiper, type SwipeMeal } from "./MealSwiper";
import { type MealPlanMeal } from "@/hooks/useMealTracking";
import { Check, ChevronRight, Loader2 } from "lucide-react";

interface WeekPlanReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedDays: { date: string; meals: MealPlanMeal[] }[];
  onConfirm: (days: { date: string; meals: MealPlanMeal[] }[]) => void;
  isSaving: boolean;
}

export function WeekPlanReviewSheet({
  open,
  onOpenChange,
  generatedDays,
  onConfirm,
  isSaving,
}: WeekPlanReviewSheetProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  // Track kept meals per day index
  const [keptMeals, setKeptMeals] = useState<Record<number, MealPlanMeal[]>>({});
  const [dayComplete, setDayComplete] = useState<Record<number, boolean>>({});

  const currentDay = generatedDays[currentDayIndex];
  const allDaysReviewed = currentDayIndex >= generatedDays.length || Object.keys(dayComplete).length === generatedDays.length;

  // Convert current day's meals to SwipeMeal format
  const swipeMeals: SwipeMeal[] = useMemo(() => {
    if (!currentDay) return [];
    return currentDay.meals.map((m, i) => ({
      id: `${currentDayIndex}-${i}`,
      name: m.name,
      description: m.description,
      calories: m.est_calories,
      mealType: m.meal_type as SwipeMeal["mealType"],
      tags: [m.meal_type],
      emoji: m.meal_type === "breakfast" ? "🍳" : m.meal_type === "lunch" ? "🥗" : m.meal_type === "dinner" ? "🍽️" : "🥜",
    }));
  }, [currentDay, currentDayIndex]);

  const handleAccept = useCallback((meal: SwipeMeal) => {
    const originalIndex = parseInt(meal.id.split("-")[1]);
    const original = currentDay.meals[originalIndex];
    setKeptMeals((prev) => ({
      ...prev,
      [currentDayIndex]: [...(prev[currentDayIndex] || []), original],
    }));
  }, [currentDay, currentDayIndex]);

  const handleReject = useCallback((_meal: SwipeMeal) => {
    // Just skip — don't add to kept
  }, []);

  const handleSaveToLibrary = useCallback((meal: SwipeMeal) => {
    // Also keep the meal when saved to library
    const originalIndex = parseInt(meal.id.split("-")[1]);
    const original = currentDay.meals[originalIndex];
    setKeptMeals((prev) => ({
      ...prev,
      [currentDayIndex]: [...(prev[currentDayIndex] || []), original],
    }));
  }, [currentDay, currentDayIndex]);

  const handleDayDone = useCallback(() => {
    setDayComplete((prev) => ({ ...prev, [currentDayIndex]: true }));
    if (currentDayIndex < generatedDays.length - 1) {
      setCurrentDayIndex((prev) => prev + 1);
    }
  }, [currentDayIndex, generatedDays.length]);

  const handleConfirm = useCallback(() => {
    const confirmedDays = generatedDays.map((day, i) => ({
      date: day.date,
      meals: keptMeals[i] || [],
    }));
    onConfirm(confirmedDays);
  }, [generatedDays, keptMeals, onConfirm]);

  // Reset state when sheet opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setCurrentDayIndex(0);
      setKeptMeals({});
      setDayComplete({});
    }
    onOpenChange(val);
  };

  const totalKept = Object.values(keptMeals).reduce((s, arr) => s + arr.length, 0);
  const totalGenerated = generatedDays.reduce((s, d) => s + d.meals.length, 0);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base">
            {allDaysReviewed ? "Week Plan Summary" : `Review: ${currentDay ? format(new Date(currentDay.date + "T12:00:00"), "EEEE, MMM d") : ""}`}
          </SheetTitle>
        </SheetHeader>

        {!allDaysReviewed && currentDay ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center mb-3">
              {generatedDays.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < currentDayIndex
                      ? "bg-primary"
                      : i === currentDayIndex
                      ? "bg-primary/60"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mb-3">
              Swipe right to keep, left to skip · {currentDay.meals.length} meals
            </p>

            <div className="flex-1 overflow-auto">
              <MealSwiper
                key={currentDayIndex}
                meals={swipeMeals}
                onAccept={handleAccept}
                onReject={handleReject}
                onSaveToLibrary={handleSaveToLibrary}
                currentMealType={format(new Date(currentDay.date + "T12:00:00"), "EEEE")}
              />
            </div>

            {/* When MealSwiper shows "all caught up", show next day button */}
            <div className="pt-3 border-t border-border/30">
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleDayDone}
              >
                {currentDayIndex < generatedDays.length - 1 ? (
                  <>
                    Next Day <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Review Summary <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                {keptMeals[currentDayIndex]?.length || 0} kept for this day
              </p>
            </div>
          </div>
        ) : (
          /* Summary screen */
          <div className="flex-1 flex flex-col overflow-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Keeping {totalKept} of {totalGenerated} meals across {generatedDays.length} days
            </p>

            <div className="space-y-2 flex-1 overflow-auto">
              {generatedDays.map((day, i) => {
                const kept = keptMeals[i] || [];
                return (
                  <div key={day.date} className="rounded-lg border border-border/30 px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-foreground">
                        {format(new Date(day.date + "T12:00:00"), "EEE, MMM d")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {kept.length} meals · {kept.reduce((s, m) => s + (m.est_calories || 0), 0)} cal
                      </span>
                    </div>
                    {kept.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {kept.map((m, j) => (
                          <p key={j} className="text-[11px] text-muted-foreground">
                            <span className="capitalize">{m.meal_type}</span> · {m.name}
                          </p>
                        ))}
                      </div>
                    )}
                    {kept.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">No meals kept</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border/30 space-y-2">
              <Button
                className="w-full gap-2"
                onClick={handleConfirm}
                disabled={isSaving || totalKept === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirm Week ({totalKept} meals)
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => onOpenChange(false)}
              >
                Discard All
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
