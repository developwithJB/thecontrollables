import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Flame, Clock, Share2 } from "lucide-react";

interface RecipeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: any;
  onAddToWeek: () => void;
  onDelete: () => void;
}

export function RecipeDetailSheet({ open, onOpenChange, recipe, onAddToWeek, onDelete }: RecipeDetailSheetProps) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl flex flex-col p-0">
        {/* Hero */}
        <div className="h-36 bg-muted/30 flex items-center justify-center border-b border-border/30 shrink-0">
          <span className="text-6xl">{recipe.emoji || "🍽️"}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl font-display text-left">{recipe.name}</SheetTitle>
            {recipe.description && (
              <p className="text-sm text-muted-foreground text-left">{recipe.description}</p>
            )}
          </SheetHeader>

          {/* Macros row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {recipe.est_calories && (
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {recipe.est_calories} cal
              </span>
            )}
            {recipe.prep_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {recipe.prep_minutes} min
              </span>
            )}
            {recipe.est_protein && <span>{recipe.est_protein}g protein</span>}
            {recipe.est_carbs && <span>{recipe.est_carbs}g carbs</span>}
            {recipe.est_fat && <span>{recipe.est_fat}g fat</span>}
          </div>

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Ingredients</h4>
              <ul className="space-y-1">
                {ingredients.map((ing: any, i: number) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{typeof ing === "string" ? ing : ing.name || ing.item || JSON.stringify(ing)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Instructions</h4>
              <ol className="space-y-2">
                {instructions.map((step: any, i: number) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                    <span>{typeof step === "string" ? step : step.text || step.step || JSON.stringify(step)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border/40 flex gap-2 shrink-0">
          <Button className="flex-1 gap-2" onClick={onAddToWeek}>
            <Plus className="w-4 h-4" /> Add to Week
          </Button>
          <Button variant="outline" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
