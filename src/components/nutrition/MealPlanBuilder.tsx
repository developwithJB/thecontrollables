import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, ArrowLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MealSwiper, type SwipeMeal } from "./MealSwiper";
import { useMealTracking, useSaveRecipe, type MealSlotConfig } from "@/hooks/useMealTracking";
import { useMealPreferences } from "@/hooks/useMealPreferences";

type BuilderPhase =
  | "preferences"
  | "generating"
  | "swiping"
  | "review";

type MealTypeSlot = "breakfast" | "lunch" | "dinner" | "snack";

const MOOD_CHIPS = [
  { label: "Light & fresh", emoji: "🥗" },
  { label: "High protein", emoji: "💪" },
  { label: "Comfort food", emoji: "🍲" },
  { label: "Surprise me", emoji: "🎲" },
];

const MEAL_TYPE_ORDER: MealTypeSlot[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<MealTypeSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

interface AcceptedMeal {
  slot: MealTypeSlot;
  meal: SwipeMeal;
}

interface MealPlanBuilderProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  slotConfig: MealSlotConfig;
  onConfirm: (meals: any[]) => void;
  isGenerating: boolean;
  onGenerate: (config: any) => Promise<any>;
}

export function MealPlanBuilder({
  open,
  onClose,
  userId,
  slotConfig,
  onConfirm,
  isGenerating,
  onGenerate,
}: MealPlanBuilderProps) {
  const [phase, setPhase] = useState<BuilderPhase>("preferences");
  const [mood, setMood] = useState("");
  const [acceptedMeals, setAcceptedMeals] = useState<AcceptedMeal[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [currentSuggestions, setCurrentSuggestions] = useState<SwipeMeal[]>([]);
  const [swapSlot, setSwapSlot] = useState<MealTypeSlot | null>(null);
  const [chatMessages, setChatMessages] = useState<{ from: "satellite" | "user"; text: string }[]>([]);
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);

  const { preferences } = useMealPreferences(userId);
  const saveRecipe = useSaveRecipe(userId);

  // Get active slots based on config
  const activeSlots = MEAL_TYPE_ORDER.filter((slot) => {
    if (slot === "snack") return (slotConfig.snackCount ?? 1) > 0;
    return !(slotConfig.excludeMeals ?? []).includes(slot);
  });

  const currentSlot = swapSlot || activeSlots[currentSlotIndex];

  const resetBuilder = useCallback(() => {
    setPhase("preferences");
    setMood("");
    setAcceptedMeals([]);
    setCurrentSlotIndex(0);
    setCurrentSuggestions([]);
    setSwapSlot(null);
    setChatMessages([]);
  }, []);

  const handleClose = () => {
    resetBuilder();
    onClose();
  };

  const addChat = (from: "satellite" | "user", text: string) => {
    setChatMessages((prev) => [...prev, { from, text }]);
  };

  const generateForSlot = async (slot: MealTypeSlot, moodPref?: string) => {
    setPhase("generating");
    addChat("satellite", `Let me find some ${MEAL_TYPE_LABELS[slot].toLowerCase()} ideas for you${moodPref ? ` — ${moodPref.toLowerCase()} vibes` : ""}...`);

    try {
      const result = await onGenerate({
        ...slotConfig,
        mood: moodPref || mood,
        single_meal_type: slot,
        dietary_style: preferences?.dietaryStyle || undefined,
        dietary_restrictions: preferences?.dietaryRestrictions?.length ? preferences.dietaryRestrictions : undefined,
        calorie_target: preferences?.calorieTarget || undefined,
        macro_targets: {
          proteinTarget: preferences?.proteinTarget || undefined,
          carbsTarget: preferences?.carbsTarget || undefined,
          fatTarget: preferences?.fatTarget || undefined,
        },
      });

      const meals = result?.meals || result || [];
      const suggestions: SwipeMeal[] = (Array.isArray(meals) ? meals : [meals]).map((m: any, i: number) => ({
        id: `${slot}-${i}-${Date.now()}`,
        name: m.name || m.meal_name || "Meal",
        description: m.description || m.instructions || "",
        calories: m.est_calories || m.calories,
        prepMinutes: m.prep_minutes || m.prepMinutes,
        mealType: slot,
        tags: m.tags || [],
        emoji: slot === "breakfast" ? "🌅" : slot === "lunch" ? "☀️" : slot === "dinner" ? "🌙" : "🍎",
      }));

      if (suggestions.length === 0) {
        suggestions.push({
          id: `${slot}-fallback-${Date.now()}`,
          name: `${MEAL_TYPE_LABELS[slot]} suggestion`,
          description: "A balanced meal tailored to your preferences.",
          calories: 500,
          mealType: slot,
          tags: [],
          emoji: slot === "breakfast" ? "🌅" : slot === "lunch" ? "☀️" : slot === "dinner" ? "🌙" : "🍎",
        });
      }

      setCurrentSuggestions(suggestions);
      addChat("satellite", `Here's a ${MEAL_TYPE_LABELS[slot].toLowerCase()} idea — swipe right to keep it, left to skip.`);
      setPhase("swiping");
    } catch {
      addChat("satellite", "Hmm, I hit a snag. Let me try again...");
      setPhase("preferences");
    }
  };

  const handleMoodSelect = async (selectedMood: string) => {
    setMood(selectedMood);
    addChat("user", selectedMood);
    await generateForSlot(activeSlots[0], selectedMood);
  };

  const handleAccept = (meal: SwipeMeal) => {
    const slot = swapSlot || currentSlot;
    if (swapSlot) {
      // Replacing an existing meal
      setAcceptedMeals((prev) => prev.map((m) => (m.slot === swapSlot ? { slot: swapSlot, meal } : m)));
      setSwapSlot(null);
      addChat("satellite", `Swapped! ${meal.name} is locked in. ✓`);
      setPhase("review");
    } else {
      setAcceptedMeals((prev) => [...prev, { slot, meal }]);
      addChat("satellite", `${meal.name} — locked in! ✓`);

      const nextIndex = currentSlotIndex + 1;
      if (nextIndex < activeSlots.length) {
        setCurrentSlotIndex(nextIndex);
        generateForSlot(activeSlots[nextIndex]);
      } else {
        addChat("satellite", "Your meal plan is ready! Review and confirm below.");
        setPhase("review");
      }
    }
  };

  const handleReject = (meal: SwipeMeal) => {
    addChat("satellite", "No worries, let me find something else...");
    // Generate another suggestion for the same slot
    generateForSlot(swapSlot || currentSlot);
  };

  const handleSaveToLibrary = (meal: SwipeMeal) => {
    saveRecipe.mutate({
      name: meal.name,
      description: meal.description,
      emoji: meal.emoji,
      meal_type: meal.mealType,
      est_calories: meal.calories,
      prep_minutes: meal.prepMinutes,
      tags: meal.tags,
      source: "swiper",
    });
    addChat("satellite", `Saved ${meal.name} to your library! Let me find another option...`);
    generateForSlot(swapSlot || currentSlot);
  };

  const handleRemoveMeal = (index: number) => {
    setAcceptedMeals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSwapMeal = (slot: MealTypeSlot) => {
    setSwapSlot(slot);
    generateForSlot(slot);
  };

  const handleConfirm = () => {
    const meals = acceptedMeals.map((am) => ({
      meal_type: am.slot,
      name: am.meal.name,
      description: am.meal.description,
      est_calories: am.meal.calories || 0,
      est_protein: 0,
      est_carbs: 0,
      est_fat: 0,
      tags: am.meal.tags,
    }));
    onConfirm(meals);
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛰️</span>
              <SheetTitle className="text-base font-display">Fuel Check</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Chat Messages */}
          <AnimatePresence mode="popLayout">
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    msg.from === "satellite"
                      ? "bg-muted text-foreground rounded-bl-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm"
                  }`}
                >
                  {msg.from === "satellite" && <span className="mr-1">🛰️</span>}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Phase: Preferences */}
          {phase === "preferences" && chatMessages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm text-sm max-w-[85%]">
                <span className="mr-1">🛰️</span>
                What sounds good today? I'll build your plan one meal at a time.
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {MOOD_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleMoodSelect(chip.label)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span>{chip.emoji}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase: Generating */}
          {phase === "generating" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Finding {MEAL_TYPE_LABELS[currentSlot]?.toLowerCase() || "meal"} ideas...
              </p>
            </motion.div>
          )}

          {/* Phase: Swiping */}
          {phase === "swiping" && currentSuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {MEAL_TYPE_LABELS[swapSlot || currentSlot]}
                </span>
              </div>
              <MealSwiper
                meals={currentSuggestions}
                onAccept={handleAccept}
                onReject={handleReject}
                onSaveToLibrary={handleSaveToLibrary}
                currentMealType={MEAL_TYPE_LABELS[swapSlot || currentSlot]?.toLowerCase()}
              />
            </motion.div>
          )}

          {/* Phase: Review */}
          {phase === "review" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Your Meal Plan
              </p>
              {acceptedMeals.map((am, i) => (
                <div
                  key={`${am.slot}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-lg">{am.meal.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground capitalize">{am.slot}</p>
                      <p className="text-sm font-medium text-foreground truncate">{am.meal.name}</p>
                      {am.meal.calories && (
                        <p className="text-xs text-muted-foreground">{am.meal.calories} cal</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleSwapMeal(am.slot)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMeal(i)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {acceptedMeals.length > 0 && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={handleConfirm} className="w-full gap-2">
                    <Check className="w-4 h-4" />
                    Confirm Plan
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              )}

              {acceptedMeals.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No meals added yet.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={resetBuilder}>
                    Start over
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
