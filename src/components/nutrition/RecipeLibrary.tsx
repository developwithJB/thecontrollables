import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Filter, Plus, Calendar, Trash2, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RecipeDetailSheet } from "./RecipeDetailSheet";
import { useSavedRecipes, useDeleteRecipe, useAddRecipeToDay } from "@/hooks/useMealTracking";

interface RecipeLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

const FILTER_CHIPS = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

export function RecipeLibrary({ open, onOpenChange, userId }: RecipeLibraryProps) {
  const [filter, setFilter] = useState("All");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [dayPickerRecipeId, setDayPickerRecipeId] = useState<string | null>(null);

  const { data: recipes = [], isLoading } = useSavedRecipes(userId);
  const deleteRecipe = useDeleteRecipe(userId);
  const addToDay = useAddRecipeToDay(userId);

  const filtered = filter === "All"
    ? recipes
    : recipes.filter((r: any) => r.meal_type?.toLowerCase() === filter.toLowerCase());

  const selectedRecipe = recipes.find((r: any) => r.id === selectedRecipeId);

  const handleAddToDay = (recipeId: string, date: string) => {
    const recipe = recipes.find((r: any) => r.id === recipeId);
    if (!recipe) return;
    addToDay.mutate({ recipe, date });
    setDayPickerRecipeId(null);
  };

  // Generate next 7 days for day picker
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toLocaleDateString("sv-SE"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <SheetTitle className="text-base font-display">Recipe Library</SheetTitle>
            </div>
          </SheetHeader>

          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setFilter(chip)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    filter === chip
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/50 border-border/40 text-muted-foreground"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No recipes yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Save recipes from the meal builder to build your library.
                </p>
              </div>
            ) : (
              <div className="columns-2 gap-3 pt-2 [&>*]:break-inside-avoid [&>*]:mb-3">
                <AnimatePresence>
                  {filtered.map((recipe: any) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="rounded-xl border border-border/60 bg-card overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedRecipeId(recipe.id)}
                    >
                      {/* Image / Emoji placeholder */}
                      <div className="h-28 bg-muted/30 flex items-center justify-center">
                        <span className="text-4xl">{recipe.emoji || "🍽️"}</span>
                      </div>

                      <div className="p-2.5 space-y-1.5">
                        <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                          {recipe.name}
                        </h4>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {recipe.est_calories && (
                            <span className="flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> {recipe.est_calories}
                            </span>
                          )}
                          {recipe.prep_minutes && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {recipe.prep_minutes}m
                            </span>
                          )}
                        </div>

                        {recipe.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-muted text-[9px] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 text-[10px] flex-1 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDayPickerRecipeId(recipe.id);
                            }}
                          >
                            <Plus className="w-2.5 h-2.5" /> Add to Week
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Recipe Detail */}
      {selectedRecipe && (
        <RecipeDetailSheet
          open={!!selectedRecipeId}
          onOpenChange={(o) => !o && setSelectedRecipeId(null)}
          recipe={selectedRecipe}
          onAddToWeek={() => setDayPickerRecipeId(selectedRecipeId)}
          onDelete={() => {
            deleteRecipe.mutate(selectedRecipeId!);
            setSelectedRecipeId(null);
          }}
        />
      )}

      {/* Day Picker mini-sheet */}
      <Sheet open={!!dayPickerRecipeId} onOpenChange={(o) => !o && setDayPickerRecipeId(null)}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-sm font-display">Add to which day?</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 pb-4">
            {next7Days.map((day) => (
              <Button
                key={day.date}
                variant="outline"
                size="sm"
                className="text-xs justify-start gap-2"
                onClick={() => dayPickerRecipeId && handleAddToDay(dayPickerRecipeId, day.date)}
                disabled={addToDay.isPending}
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
