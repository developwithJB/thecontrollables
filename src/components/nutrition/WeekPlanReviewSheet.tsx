import { useState, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MealSwiper, type SwipeMeal, type MealSwiperHandle } from "./MealSwiper";
import { type MealPlanMeal } from "@/hooks/useMealTracking";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

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
  const [keptMeals, setKeptMeals] = useState<Record<number, MealPlanMeal[]>>({});
  const [dayComplete, setDayComplete] = useState<Record<number, boolean>>({});
  const [pendingAssign, setPendingAssign] = useState<MealPlanMeal | null>(null);

  const currentDay = generatedDays[currentDayIndex];
  const allDaysReviewed = currentDayIndex >= generatedDays.length || Object.keys(dayComplete).length === generatedDays.length;

  // Build a lookup of occupied slots: "dayIndex-mealType" → meal name
  const occupiedSlots = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(keptMeals).forEach(([dayIdx, meals]) => {
      meals.forEach((m) => {
        const key = `${dayIdx}-${m.meal_type}`;
        map[key] = m.name;
      });
    });
    return map;
  }, [keptMeals]);

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
    setPendingAssign(original);
  }, [currentDay]);

  const handleReject = useCallback((_meal: SwipeMeal) => {}, []);

  const handleSaveToLibrary = useCallback((meal: SwipeMeal) => {
    const originalIndex = parseInt(meal.id.split("-")[1]);
    const original = currentDay.meals[originalIndex];
    setPendingAssign(original);
  }, [currentDay]);

  const handleSlotPick = useCallback((dayIndex: number, mealType: string) => {
    if (!pendingAssign) return;
    const assigned: MealPlanMeal = { ...pendingAssign, meal_type: mealType };
    setKeptMeals((prev) => {
      const existing = prev[dayIndex] || [];
      // Replace if same meal_type already occupied, otherwise append
      const filtered = existing.filter((m) => m.meal_type !== mealType);
      return { ...prev, [dayIndex]: [...filtered, assigned] };
    });
    setPendingAssign(null);
  }, [pendingAssign]);

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

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setCurrentDayIndex(0);
      setKeptMeals({});
      setDayComplete({});
      setPendingAssign(null);
    }
    onOpenChange(val);
  };

  const totalKept = Object.values(keptMeals).reduce((s, arr) => s + arr.length, 0);
  const totalGenerated = generatedDays.reduce((s, d) => s + d.meals.length, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">
              {allDaysReviewed ? "Week Plan Summary" : `Review: ${currentDay ? format(new Date(currentDay.date + "T12:00:00"), "EEEE, MMM d") : ""}`}
            </SheetTitle>
          </SheetHeader>

          {!allDaysReviewed && currentDay ? (
            <div className="flex-1 flex flex-col overflow-hidden">
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

              <div className="pt-3 border-t border-border/30">
                <Button className="w-full gap-2" size="sm" onClick={handleDayDone}>
                  {currentDayIndex < generatedDays.length - 1 ? (
                    <>Next Day <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>Review Summary <Check className="w-4 h-4" /></>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  {keptMeals[currentDayIndex]?.length || 0} kept for this day
                </p>
              </div>
            </div>
          ) : (
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
                <Button className="w-full gap-2" onClick={handleConfirm} disabled={isSaving || totalKept === 0}>
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Confirm Week ({totalKept} meals)</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onOpenChange(false)}>
                  Discard All
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Slot Picker Dialog */}
      <AlertDialog open={!!pendingAssign} onOpenChange={(v) => !v && setPendingAssign(null)}>
        <AlertDialogContent className="max-w-sm max-h-[70vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Where should "{pendingAssign?.name}" go?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 mt-2">
            {generatedDays.map((day, dayIdx) => {
              const dayLabel = format(new Date(day.date + "T12:00:00"), "EEE, MMM d");
              return (
                <div key={day.date}>
                  <p className="text-xs font-medium text-foreground mb-1.5">{dayLabel}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MEAL_TYPES.map((type) => {
                      const slotKey = `${dayIdx}-${type}`;
                      const occupant = occupiedSlots[slotKey];
                      return (
                        <button
                          key={type}
                          onClick={() => handleSlotPick(dayIdx, type)}
                          className={`relative rounded-md px-2 py-2 text-[11px] text-center transition-colors border ${
                            occupant
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          {MEAL_LABELS[type]}
                          {occupant && (
                            <Check className="w-3 h-3 absolute top-0.5 right-0.5 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <AlertDialogCancel className="mt-3 w-full text-xs gap-1">
            <X className="w-3 h-3" /> Skip This Meal
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
