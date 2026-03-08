import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MealLogEntry } from "./MealLogEntry";
import { useMealTracking, type MealAnalysis } from "@/hooks/useMealTracking";
import { useMemo } from "react";

interface MealTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const DEFAULT_SLOTS = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch", label: "Lunch", emoji: "☀️" },
  { type: "dinner", label: "Dinner", emoji: "🌙" },
  { type: "snack", label: "Snack", emoji: "🍎" },
];

const EMOJI_MAP: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

export function MealTracker({ isOpen, onClose, userId }: MealTrackerProps) {
  const { todayMeals, dailyTotals, analyzeMeal, todayPlan } = useMealTracking(userId);

  // Derive slots from plan if available
  const mealSlots = useMemo(() => {
    if (!todayPlan || !(todayPlan.meals as any[])?.length) return DEFAULT_SLOTS;

    const planMeals = todayPlan.meals as any[];
    return planMeals.map((m: any) => {
      const t = m.meal_type as string;
      const isSnack = t.startsWith("snack");
      return {
        type: t,
        label: isSnack ? t.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : t.charAt(0).toUpperCase() + t.slice(1),
        emoji: EMOJI_MAP[t] || "🍎",
      };
    });
  }, [todayPlan]);

  const getMealForType = (type: string) =>
    todayMeals.find((m) => m.meal_type === type);

  const calorieTarget = 2000;
  const caloriePercent = Math.min(100, Math.round((dailyTotals.calories / calorieTarget) * 100));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] overflow-auto"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-4 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛰️</span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Fuel Check</h2>
                    <p className="text-[11px] text-muted-foreground">Powered by Satellite</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Calorie ring summary */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none"
                      stroke="hsl(var(--wellness))"
                      strokeWidth="4"
                      strokeDasharray={`${caloriePercent * 1.508} 150.8`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-foreground">{dailyTotals.calories}</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-medium text-foreground">{dailyTotals.protein}g</p>
                    <p className="text-[10px] text-muted-foreground">Protein</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{dailyTotals.carbs}g</p>
                    <p className="text-[10px] text-muted-foreground">Carbs</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{dailyTotals.fat}g</p>
                    <p className="text-[10px] text-muted-foreground">Fat</p>
                  </div>
                </div>
              </div>

              {/* Meal slots */}
              <div className="space-y-2">
                {mealSlots.map((slot) => {
                  const existing = getMealForType(slot.type);
                  return (
                    <MealLogEntry
                      key={slot.type}
                      mealType={slot.type}
                      mealLabel={slot.label}
                      emoji={slot.emoji}
                      existingAnalysis={existing?.ai_analysis as MealAnalysis | null}
                      existingDescription={existing?.description}
                      onSubmit={async (data) => {
                        const result = await analyzeMeal.mutateAsync(data);
                        return result;
                      }}
                      isAnalyzing={analyzeMeal.isPending}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
