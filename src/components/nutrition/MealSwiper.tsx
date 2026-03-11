import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X, Bookmark, Clock, Flame, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SwipeMeal {
  id: string;
  name: string;
  description: string;
  calories?: number;
  prepMinutes?: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  tags: string[];
  emoji: string;
}

interface MealSwiperProps {
  meals: SwipeMeal[];
  onAccept: (meal: SwipeMeal) => void;
  onReject: (meal: SwipeMeal) => void;
  onSaveToLibrary: (meal: SwipeMeal) => void;
  onRegenerate?: (meal: SwipeMeal) => void;
  currentMealType?: string;
}

const SWIPE_THRESHOLD = 100;

export const MealSwiper = ({
  meals,
  onAccept,
  onReject,
  onSaveToLibrary,
  onRegenerate,
  currentMealType = "meal",
}: MealSwiperProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const saveOpacity = useTransform(y, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const currentMeal = meals[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    setExitDirection(null);
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (!currentMeal) return;

      if (info.offset.x > SWIPE_THRESHOLD) {
        setExitDirection("right");
        onAccept(currentMeal);
        setTimeout(handleNext, 200);
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        setExitDirection("left");
        onReject(currentMeal);
        setTimeout(handleNext, 200);
      } else if (info.offset.y < -SWIPE_THRESHOLD) {
        setExitDirection("up");
        onSaveToLibrary(currentMeal);
        setTimeout(handleNext, 200);
      } else {
        // Snap back
        x.set(0);
        y.set(0);
      }
    },
    [currentMeal, onAccept, onReject, onSaveToLibrary, handleNext, x, y]
  );

  if (!currentMeal || currentIndex >= meals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">All caught up!</p>
        <p className="text-xs text-muted-foreground">
          You've reviewed all {currentMealType} suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Swipe hints */}
      <div className="flex items-center justify-between w-full max-w-xs mb-3 px-4">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <X className="w-3 h-3" /> Skip
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Bookmark className="w-3 h-3" /> Save ↑
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          Add <Check className="w-3 h-3" />
        </span>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-xs h-[320px]">
        {/* Next card preview */}
        {currentIndex + 1 < meals.length && (
          <div className="absolute inset-0 rounded-2xl border border-border bg-card scale-[0.95] opacity-50" />
        )}

        {/* Current card */}
        <motion.div
          key={currentMeal.id}
          style={{ x, y, rotate }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.8}
          onDragEnd={handleDragEnd}
          animate={
            exitDirection === "right"
              ? { x: 300, opacity: 0 }
              : exitDirection === "left"
              ? { x: -300, opacity: 0 }
              : exitDirection === "up"
              ? { y: -300, opacity: 0 }
              : {}
          }
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <div className="w-full h-full rounded-2xl border border-border bg-card flex flex-col justify-between shadow-[var(--shadow-card)] overflow-hidden">
            {/* Recipe image placeholder */}
            <div className="h-24 bg-muted/40 flex items-center justify-center border-b border-border/30">
              <span className="text-4xl">{currentMeal.emoji}</span>
            </div>

            <div className="p-5 flex flex-col justify-between flex-1">
            <motion.div
              style={{ opacity: acceptOpacity }}
              className="absolute top-4 right-4 px-3 py-1 rounded-full bg-perspective/20 text-perspective text-sm font-bold border-2 border-perspective rotate-12"
            >
              ADD ✓
            </motion.div>
            <motion.div
              style={{ opacity: rejectOpacity }}
              className="absolute top-4 left-4 px-3 py-1 rounded-full bg-destructive/20 text-destructive text-sm font-bold border-2 border-destructive -rotate-12"
            >
              SKIP ✗
            </motion.div>
            <motion.div
              style={{ opacity: saveOpacity }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-bold border-2 border-accent"
            >
              SAVED ★
            </motion.div>

            {/* Content */}
            <div>
              <span className="text-3xl">{currentMeal.emoji}</span>
              <h3 className="font-display text-lg font-semibold text-foreground mt-3 mb-1">
                {currentMeal.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentMeal.description}
              </p>
            </div>

            {/* Meta */}
            <div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {currentMeal.calories && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {currentMeal.calories} cal
                  </span>
                )}
                {currentMeal.prepMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {currentMeal.prepMinutes} min
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {currentMeal.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center gap-4 mt-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => {
            setExitDirection("left");
            onReject(currentMeal);
            setTimeout(handleNext, 200);
          }}
        >
          <X className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-10 h-10 border-accent/30 text-accent hover:bg-accent/10"
          onClick={() => {
            setExitDirection("up");
            onSaveToLibrary(currentMeal);
            setTimeout(handleNext, 200);
          }}
        >
          <Bookmark className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 border-perspective/30 text-perspective hover:bg-perspective/10"
          onClick={() => {
            setExitDirection("right");
            onAccept(currentMeal);
            setTimeout(handleNext, 200);
          }}
        >
          <Check className="w-5 h-5" />
        </Button>
      </div>

      {/* Counter */}
      <p className="text-xs text-muted-foreground mt-3">
        {currentIndex + 1} of {meals.length}
      </p>
    </div>
  );
};
