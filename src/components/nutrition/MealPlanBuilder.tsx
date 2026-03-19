import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, Calendar, Flame, Clock, Check, Bookmark, Send, Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMealPreferences } from "@/hooks/useMealPreferences";
import { useSaveRecipe } from "@/hooks/useMealTracking";
import type { MealSlotConfig } from "@/hooks/useMealTracking";

interface RecipeCard {
  id: string;
  name: string;
  description: string;
  calories?: number;
  prepMinutes?: number;
  mealType: string;
  tags: string[];
  emoji: string;
  assignedDay?: string;
}

interface MealPlanBuilderProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  slotConfig: MealSlotConfig;
  onConfirm: (meals: any[]) => void;
  isGenerating: boolean;
  onGenerate: (config: any) => Promise<any>;
  contextTags?: string[];
  contextLabel?: string | null;
}

const MOOD_CHIPS = [
  { label: "Light & fresh", emoji: "🥗" },
  { label: "High protein", emoji: "💪" },
  { label: "Comfort food", emoji: "🍲" },
  { label: "Surprise me", emoji: "🎲" },
];

function getNext7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toLocaleDateString("sv-SE"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
      short: i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
    };
  });
}

export function MealPlanBuilder({
  open,
  onClose,
  userId,
  slotConfig,
  onConfirm,
  isGenerating,
  onGenerate,
  contextTags,
  contextLabel,
}: MealPlanBuilderProps) {
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [phase, setPhase] = useState<"mood" | "loading" | "browse">("mood");
  const [dayPickerFor, setDayPickerFor] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { preferences } = useMealPreferences(userId);
  const saveRecipe = useSaveRecipe(userId);

  const days = getNext7Days();

  const resetBuilder = useCallback(() => {
    setPhase("mood");
    setRecipes([]);
    setDayPickerFor(null);
    setFreeText("");
    stopListening();
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setFreeText(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const handleClose = () => {
    resetBuilder();
    onClose();
  };

  const handleGenerate = async (mood: string) => {
    setPhase("loading");
    try {
      const result = await onGenerate({
        ...slotConfig,
        mood,
        dietary_style: preferences?.dietaryStyle || undefined,
        dietary_restrictions: preferences?.dietaryRestrictions?.length ? preferences.dietaryRestrictions : undefined,
        calorie_target: preferences?.calorieTarget || undefined,
        macro_targets: {
          proteinTarget: preferences?.proteinTarget || undefined,
          carbsTarget: preferences?.carbsTarget || undefined,
          fatTarget: preferences?.fatTarget || undefined,
        },
        context_tags: contextTags?.length ? contextTags : undefined,
      });

      const meals = result?.meals || result || [];
      const list: RecipeCard[] = (Array.isArray(meals) ? meals : [meals]).map((m: any, i: number) => ({
        id: `recipe-${i}-${Date.now()}`,
        name: m.name || m.meal_name || "Meal",
        description: m.description || m.instructions || "",
        calories: m.est_calories || m.calories,
        prepMinutes: m.prep_minutes || m.prepMinutes,
        mealType: m.meal_type || "meal",
        tags: m.tags || [],
        emoji: m.meal_type === "breakfast" ? "🌅" : m.meal_type === "lunch" ? "☀️" : m.meal_type === "dinner" ? "🌙" : "🍎",
      }));

      setRecipes(list.length > 0 ? list : [{
        id: `fallback-${Date.now()}`,
        name: "Balanced Meal",
        description: "A well-rounded meal tailored to your preferences.",
        calories: 500,
        mealType: "meal",
        tags: [],
        emoji: "🍽️",
      }]);
      setPhase("browse");
    } catch {
      setPhase("mood");
    }
  };

  const handleAssignDay = (recipeId: string, date: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, assignedDay: date } : r))
    );
    setDayPickerFor(null);
  };

  const handleUnassign = (recipeId: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, assignedDay: undefined } : r))
    );
  };

  const handleSaveToLibrary = (recipe: RecipeCard) => {
    saveRecipe.mutate({
      name: recipe.name,
      description: recipe.description,
      emoji: recipe.emoji,
      meal_type: recipe.mealType,
      est_calories: recipe.calories,
      prep_minutes: recipe.prepMinutes,
      tags: recipe.tags,
      source: "builder",
    });
  };

  const assignedRecipes = recipes.filter((r) => r.assignedDay);

  const handleConfirm = () => {
    const meals = assignedRecipes.map((r) => ({
      meal_type: r.mealType,
      name: r.name,
      description: r.description,
      est_calories: r.calories || 0,
      est_protein: 0,
      est_carbs: 0,
      est_fat: 0,
      tags: r.tags,
      plan_date: r.assignedDay,
    }));
    onConfirm(meals);
    handleClose();
  };

  const dayPickerRecipe = recipes.find((r) => r.id === dayPickerFor);

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛰️</span>
                <SheetTitle className="text-base font-display">Fuel Check</SheetTitle>
              </div>
              <div className="flex items-center gap-2">
                {phase === "browse" && assignedRecipes.length > 0 && (
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleConfirm}>
                    <Check className="w-3 h-3" />
                    Save {assignedRecipes.length}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Phase: Mood selection */}
            {phase === "mood" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 flex flex-col h-full">
                {contextLabel && (
                  <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1 w-fit mx-auto">
                    <span className="text-[11px] text-muted-foreground">{contextLabel}</span>
                  </div>
                )}
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm text-sm max-w-[85%]">
                  <span className="mr-1">🛰️</span>
                  What sounds good? Type what you're craving, use your voice, or pick a vibe below.
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {MOOD_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleGenerate(chip.label)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border/60 bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <span>{chip.emoji}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Free text + voice input */}
                <div className="flex-1" />
                <form
                  className="flex items-center gap-2 bg-muted/50 rounded-2xl border border-border/40 px-3 py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (freeText.trim()) handleGenerate(freeText.trim());
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`shrink-0 p-2 rounded-full transition-colors ${isListening ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    title={isListening ? "Stop listening" : "Speak"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <Input
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="E.g. something quick with chicken..."
                    className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 text-sm px-0"
                  />
                  <button
                    type="submit"
                    disabled={!freeText.trim()}
                    className="shrink-0 p-2 rounded-full text-primary disabled:text-muted-foreground/40 hover:bg-primary/10 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* Phase: Loading */}
            {phase === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating recipes...</p>
              </motion.div>
            )}

            {/* Phase: Browse recipe cards */}
            {phase === "browse" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Regenerate button */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {recipes.length} recipes — tap a day to assign
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1 text-muted-foreground"
                    onClick={() => setPhase("mood")}
                  >
                    <Sparkles className="w-3 h-3" />
                    New batch
                  </Button>
                </div>

                {/* Recipe card list */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {recipes.map((recipe, idx) => (
                      <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                      >
                        {/* Card header with emoji */}
                        <div className="flex items-start gap-3 p-3">
                          <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                            <span className="text-2xl">{recipe.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-foreground leading-tight">
                              {recipe.name}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {recipe.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                              {recipe.calories && (
                                <span className="flex items-center gap-0.5">
                                  <Flame className="w-3 h-3" /> {recipe.calories} cal
                                </span>
                              )}
                              {recipe.prepMinutes && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {recipe.prepMinutes} min
                                </span>
                              )}
                              <span className="capitalize">{recipe.mealType}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {recipe.tags.length > 0 && (
                          <div className="px-3 pb-2 flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="px-3 pb-3 flex items-center gap-2">
                          {recipe.assignedDay ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                                <Calendar className="w-3 h-3" />
                                {days.find((d) => d.date === recipe.assignedDay)?.label || recipe.assignedDay}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-muted-foreground"
                                onClick={() => handleUnassign(recipe.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs gap-1.5 flex-1"
                              onClick={() => setDayPickerFor(recipe.id)}
                            >
                              <Calendar className="w-3 h-3" />
                              Assign to day
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-accent shrink-0"
                            onClick={() => handleSaveToLibrary(recipe)}
                            title="Save to library"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Day Picker Sheet */}
      <Sheet open={!!dayPickerFor} onOpenChange={(o) => !o && setDayPickerFor(null)}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-sm font-display">
              {dayPickerRecipe ? `Assign "${dayPickerRecipe.name}"` : "Pick a day"}
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 pb-4">
            {days.map((day) => (
              <Button
                key={day.date}
                variant="outline"
                size="sm"
                className="text-xs justify-start gap-2"
                onClick={() => dayPickerFor && handleAssignDay(dayPickerFor, day.date)}
              >
                <Calendar className="w-3 h-3" />
                {day.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
