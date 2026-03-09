import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Play, Check, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomations, type AutomationRecipe } from "@/hooks/useAutomations";

const SYSTEM_ICONS: Record<string, string> = {
  planner: "📋",
  meals: "🍽️",
  money: "💰",
  mode: "⚡",
};

interface AutomationRailProps {
  userId: string;
  /** Only show these recipe keys (context-aware filtering) */
  suggestedKeys?: string[];
  compact?: boolean;
}

export function AutomationRail({ userId, suggestedKeys, compact = false }: AutomationRailProps) {
  const { recipes, runAutomation, isRunning, recentRuns } = useAutomations(userId);
  const [lastRanKey, setLastRanKey] = useState<string | null>(null);

  const displayRecipes = suggestedKeys
    ? recipes.filter(r => suggestedKeys.includes(r.key))
    : recipes;

  // Mark recently-run recipes
  const recentKeys = new Set(recentRuns.filter((r: any) => r.status === "completed").map((r: any) => r.recipe_key));

  const handleRun = (key: string) => {
    setLastRanKey(key);
    runAutomation(key);
  };

  if (displayRecipes.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-1.5">
        {displayRecipes.slice(0, 3).map((recipe) => (
          <Button
            key={recipe.key}
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs"
            disabled={isRunning && lastRanKey === recipe.key}
            onClick={() => handleRun(recipe.key)}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />
              {recipe.label}
            </span>
            {isRunning && lastRanKey === recipe.key ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : recentKeys.has(recipe.key) ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {displayRecipes.map((recipe, index) => (
          <motion.div
            key={recipe.key}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs h-auto py-2.5 px-3"
              disabled={isRunning && lastRanKey === recipe.key}
              onClick={() => handleRun(recipe.key)}
            >
              <div className="flex items-start gap-2 text-left">
                <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                  {recipe.affected_systems.map(sys => (
                    <span key={sys} className="text-xs">{SYSTEM_ICONS[sys] || "📦"}</span>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-foreground">{recipe.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                    {recipe.description}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {isRunning && lastRanKey === recipe.key ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : recentKeys.has(recipe.key) ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
