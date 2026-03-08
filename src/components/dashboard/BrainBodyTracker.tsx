import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBrainBodyHealth } from "@/hooks/useBrainBodyHealth";
import { Brain, Dumbbell, Moon, Monitor, Salad, Activity, TrendingUp, TrendingDown, Minus, Upload, ClipboardList, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "./ControllableLevelBadge";

const wellnessTheme = getControllableTheme("wellness");

interface BrainBodyTrackerProps {
  userId: string | undefined;
  onLogWellness?: () => void;
  onQuickLog?: (sleep: number, movement: number, nutrition: number) => Promise<boolean>;
  onImportHealth?: () => void;
}

const QUICK_STEPS = [
  { key: "sleep", question: "How did you sleep last night?", emojis: ["😩", "😕", "😐", "🙂", "😴"] },
  { key: "movement", question: "How active were you yesterday?", emojis: ["🪑", "🚶", "🏃", "💪", "🔥"] },
  { key: "nutrition", question: "How was your nutrition?", emojis: ["🍟", "🍕", "🥪", "🥗", "🥑"] },
] as const;

function QuickCheckIn({ onComplete, onLogInstead, onImport }: {
  onComplete: (sleep: number, movement: number, nutrition: number) => void;
  onLogInstead?: () => void;
  onImport?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<number[]>([]);

  const handleRate = useCallback((rating: number) => {
    const newRatings = [...ratings, rating];
    setRatings(newRatings);

    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete(newRatings[0], newRatings[1], newRatings[2]);
    }
  }, [step, ratings, onComplete]);

  const currentStep = QUICK_STEPS[step];

  return (
    <div className="py-2">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {QUICK_STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i <= step ? "w-6 bg-wellness" : "w-1.5 bg-border"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="text-center"
        >
          <p className="text-sm font-medium text-foreground mb-3">
            {currentStep.question}
          </p>
          <div className="flex justify-center gap-2">
            {currentStep.emojis.map((emoji, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleRate(i + 1)}
                className={cn(
                  "w-11 h-11 rounded-xl text-xl flex items-center justify-center",
                  "bg-muted/50 hover:bg-muted border border-transparent",
                  "hover:border-wellness/30 transition-colors cursor-pointer"
                )}
                aria-label={`Rate ${i + 1} out of 5`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {step === 0 ? "Terrible → Amazing" : step === 1 ? "Sedentary → Very Active" : "Poor → Excellent"}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Secondary actions */}
      <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border/50">
        {onImport && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground" onClick={onImport}>
            <Upload className="h-3 w-3" />
            Import Health Data
          </Button>
        )}
        {onLogInstead && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-muted-foreground" onClick={onLogInstead}>
            <ClipboardList className="h-3 w-3" />
            Full log instead
          </Button>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ score, emoji, label, size = 100 }: { score: number; emoji: string; label: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  const color = score >= 70
    ? "hsl(var(--perspective))"
    : score >= 40
    ? "hsl(var(--awareness))"
    : "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={6}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl">{emoji}</span>
          <span className="text-sm font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function FactorChip({ icon: Icon, label, score }: { icon: typeof Moon; label: string; score: number }) {
  const variant = score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="gap-1 text-[10px] px-2 py-0.5">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

const SATELLITE_TIPS: Record<string, string> = {
  sleep: "🛰️ Sleep is your foundation — even one extra hour compounds.",
  movement: "🛰️ Your body needs motion. Even a 10-min walk shifts everything.",
  screenTime: "🛰️ Reclaim wasted screen time — your brain will thank you.",
  nutrition: "🛰️ What you put in determines what you get out.",
  default: "🛰️ Log your wellness data to see your Brain & Body status.",
};

export function BrainBodyTracker({ userId, onLogWellness, onQuickLog, onImportHealth }: BrainBodyTrackerProps) {
  const { brainScore, bodyScore, factors, trend, hasData, hasHealthSync, isLoading } = useBrainBodyHealth(userId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickComplete = useCallback(async (sleep: number, movement: number, nutrition: number) => {
    if (!onQuickLog) return;
    setIsSubmitting(true);
    await onQuickLog(sleep, movement, nutrition);
    setIsSubmitting(false);
  }, [onQuickLog]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-40" />
      </Card>
    );
  }

  // Find weakest factor for satellite tip
  const weakest = hasData
    ? (Object.entries(factors) as [string, number][]).reduce((min, [k, v]) =>
        v < min[1] ? [k, v] : min, ["default", 101])[0]
    : "default";

  const trendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card
          className={cn(
            "transition-shadow hover:shadow-md",
            wellnessTheme.borderClass,
            isSubmitting && "opacity-60 pointer-events-none"
          )}
        >
          <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-wellness" />
                <h3 className="text-sm font-semibold text-foreground">Brain & Body</h3>
                <span className={`text-xs font-medium ${wellnessTheme.textClass}`}>{wellnessTheme.emoji} {wellnessTheme.label}</span>
                <ControllableLevelBadge controllable="wellness" />
              </div>
              <div className="flex items-center gap-2">
                {hasData && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendIcon className="h-3 w-3" />
                    <span>7-day</span>
                  </div>
                )}
              </div>
            </div>

            {hasData ? (
              <>
                {/* Score Rings */}
                <div className="flex justify-center gap-8 mb-4">
                  <ScoreRing score={brainScore} emoji="🧠" label="Brain" />
                  <ScoreRing score={bodyScore} emoji="💪" label="Body" />
                </div>

                {/* Factor Chips */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                  <FactorChip icon={Moon} label="Sleep" score={factors.sleep} />
                  <FactorChip icon={Dumbbell} label="Movement" score={factors.movement} />
                  <FactorChip icon={Monitor} label="Screen" score={factors.screenTime} />
                  <FactorChip icon={Salad} label="Nutrition" score={factors.nutrition} />
                </div>

                {/* Satellite Tip */}
                <p className="text-xs text-muted-foreground text-center italic">
                  {SATELLITE_TIPS[weakest] || SATELLITE_TIPS.default}
                </p>
              </>
            ) : (
              <QuickCheckIn
                onComplete={handleQuickComplete}
                onLogInstead={onLogWellness}
                onImport={onImportHealth}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
