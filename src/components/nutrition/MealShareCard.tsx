import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";

type ShareMode = "eating-today" | "ate-today" | "week-plan";

interface MealItem {
  meal_type: string;
  name: string;
  est_calories: number;
  est_protein?: number;
  est_carbs?: number;
  est_fat?: number;
}

interface MealShareCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meals: MealItem[];
  mode?: ShareMode;
  totalCalories?: number;
  weekDays?: { label: string; calories: number; mealCount: number }[];
}

const MODE_CONFIG: Record<ShareMode, { heading: string; emoji: string; accent: string }> = {
  "eating-today": { heading: "I'm eating today", emoji: "🍽️", accent: "from-primary to-primary/60" },
  "ate-today": { heading: "I ate today", emoji: "✅", accent: "from-green-500 to-emerald-400" },
  "week-plan": { heading: "My week plan", emoji: "📋", accent: "from-chart-1 to-chart-2" },
};

function ShareCardContent({
  meals,
  mode,
  totalCalories,
  weekDays,
}: {
  meals: MealItem[];
  mode: ShareMode;
  totalCalories: number;
  weekDays?: MealShareCardProps["weekDays"];
}) {
  const config = MODE_CONFIG[mode];
  const totalProtein = meals.reduce((s, m) => s + (m.est_protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.est_carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.est_fat || 0), 0);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
      }}
    >
      {/* Header band */}
      <div className={cn("px-5 py-4 bg-gradient-to-r text-white", config.accent)}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <h3 className="text-base font-bold">{config.heading}</h3>
            <p className="text-xs opacity-90">{totalCalories} calories</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {mode === "week-plan" && weekDays ? (
          <div className="space-y-1.5">
            {weekDays.map((day, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-muted-foreground">{day.calories} cal · {day.mealCount} meals</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {meals.map((meal, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize w-16 text-[11px]">
                    {meal.meal_type.replace("_", " ")}
                  </span>
                  <span className="text-foreground font-medium">{meal.name}</span>
                </div>
                <span className="text-muted-foreground">{meal.est_calories} cal</span>
              </div>
            ))}
          </div>
        )}

        {/* Macros bar */}
        {(totalProtein > 0 || totalCarbs > 0 || totalFat > 0) && mode !== "week-plan" && (
          <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
            {totalProtein > 0 && <span>🥩 {totalProtein}g protein</span>}
            {totalCarbs > 0 && <span>🌾 {totalCarbs}g carbs</span>}
            {totalFat > 0 && <span>🥑 {totalFat}g fat</span>}
          </div>
        )}

        {/* Branding */}
        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">Powered by</span>
          <span className="text-[10px] font-semibold text-foreground">The Controllables</span>
          <span className="text-xs">🛰️</span>
        </div>
      </div>
    </div>
  );
}

export function MealShareCard({ open, onOpenChange, meals, mode: defaultMode, totalCalories, weekDays }: MealShareCardProps) {
  const [mode, setMode] = useState<ShareMode>(defaultMode || "eating-today");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const computedCalories = totalCalories || meals.reduce((s, m) => s + (m.est_calories || 0), 0);

  const exportAsImage = useCallback(async () => {
    if (!cardRef.current) return null;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      return canvas.toDataURL("image/png");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const imageData = await exportAsImage();
    if (!imageData) return;

    // Try Web Share API with image
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(imageData)).blob();
        const file = new File([blob], "meal-plan.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: MODE_CONFIG[mode].heading,
            text: `${MODE_CONFIG[mode].emoji} ${MODE_CONFIG[mode].heading} — ${computedCalories} calories`,
            files: [file],
          });
          return;
        }
      } catch {
        // fallback to copy
      }
    }

    // Fallback: copy text
    handleCopyText();
  }, [mode, computedCalories, exportAsImage]);

  const handleCopyText = useCallback(() => {
    const text = meals
      .map((m) => `${m.meal_type}: ${m.name} (~${m.est_calories} cal)`)
      .join("\n");
    const full = `${MODE_CONFIG[mode].emoji} ${MODE_CONFIG[mode].heading}\n${text}\n\nTotal: ${computedCalories} cal`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [meals, mode, computedCalories]);

  const handleDownload = useCallback(async () => {
    const imageData = await exportAsImage();
    if (!imageData) return;
    const link = document.createElement("a");
    link.download = "meal-plan.png";
    link.href = imageData;
    link.click();
  }, [exportAsImage]);

  const modes: ShareMode[] = weekDays ? ["week-plan"] : ["eating-today", "ate-today"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">Share Meal Plan</SheetTitle>
        </SheetHeader>

        {/* Mode selector */}
        {modes.length > 1 && (
          <div className="flex gap-1.5 my-3">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  mode === m
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/50 border-border/40 text-muted-foreground"
                )}
              >
                {MODE_CONFIG[m].emoji} {MODE_CONFIG[m].heading}
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        <div ref={cardRef} className="my-3">
          <ShareCardContent
            meals={meals}
            mode={mode}
            totalCalories={computedCalories}
            weekDays={weekDays}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pb-4">
          <Button
            className="flex-1 gap-1.5"
            onClick={handleShare}
            disabled={exporting}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyText}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={exporting}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
