import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBrainBodyHealth } from "@/hooks/useBrainBodyHealth";
import { Brain, Dumbbell, Moon, Monitor, Salad, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "./ControllableLevelBadge";

const wellnessTheme = getControllableTheme("wellness");

interface BrainBodyTrackerProps {
  userId: string | undefined;
  onLogWellness?: () => void;
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

export function BrainBodyTracker({ userId, onLogWellness }: BrainBodyTrackerProps) {
  const { brainScore, bodyScore, factors, trend, hasData, hasHealthSync, isLoading } = useBrainBodyHealth(userId);

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
            "cursor-pointer transition-shadow hover:shadow-md",
            wellnessTheme.borderClass,
            !hasData && "opacity-80"
          )}
          onClick={!hasData ? onLogWellness : undefined}
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
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Log your wellness to see your health status
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {SATELLITE_TIPS.default}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

    </>
  );
}
