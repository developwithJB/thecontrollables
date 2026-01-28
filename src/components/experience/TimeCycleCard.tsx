import { motion } from "framer-motion";
import { Sun, Moon, Calendar, Target, Clock, Dna } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { getArchetypeInfo, getArchetypeThemeColors, getLowestControllable, type UserBuildCurrent } from "@/lib/build";

const CONTROLLABLE_EMOJIS: Record<string, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

interface TimeCycleCardProps {
  activeQuest?: {
    title: string;
    started_at: string;
    ends_at: string | null;
    duration_days: number;
  } | null;
  currentResetDay?: number;
  hasActiveReset?: boolean;
  currentBuild?: UserBuildCurrent | null;
}

export function TimeCycleCard({ activeQuest, currentResetDay = 1, hasActiveReset, currentBuild }: TimeCycleCardProps) {
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 20 || hour < 6;
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  
  // Day phase
  const getDayPhase = () => {
    if (isNight) return { phase: "Rest", icon: Moon, color: "text-blue-400" };
    if (isMorning) return { phase: "Build", icon: Sun, color: "text-amber-400" };
    if (isAfternoon) return { phase: "Execute", icon: Target, color: "text-accent" };
    return { phase: "Reflect", icon: Clock, color: "text-purple-400" };
  };
  
  const dayPhase = getDayPhase();
  const DayIcon = dayPhase.icon;

  // Build state helpers
  const archetypeInfo = currentBuild ? getArchetypeInfo(currentBuild.build_archetype_key) : null;
  const themeColors = currentBuild ? getArchetypeThemeColors(currentBuild.build_archetype_key) : null;
  const lowestControllable = currentBuild ? getLowestControllable(currentBuild) : null;
  const lowestInfo = lowestControllable ? CONTROLLABLE_EMOJIS[lowestControllable] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Time Cycles</h3>
            <p className="text-xs text-muted-foreground">Where you are right now</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Day Cycle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: isNight ? 0 : [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${dayPhase.color}`}
            >
              <DayIcon className="w-5 h-5" />
            </motion.div>
            <div>
              <p className="font-medium text-foreground">{dayPhase.phase} Phase</p>
              <p className="text-xs text-muted-foreground">{format(now, "EEEE, h:mm a")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display font-bold text-foreground">{format(now, "d")}</p>
            <p className="text-xs text-muted-foreground">{format(now, "MMM")}</p>
          </div>
        </div>

        {/* Week Cycle */}
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Week Progress</span>
            <span className="text-xs text-muted-foreground">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <motion.div
                key={day}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: day * 0.05 }}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  day === dayOfWeek
                    ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background"
                    : day < dayOfWeek
                    ? "bg-accent/30 text-accent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["M", "T", "W", "T", "F", "S", "S"][day - 1]}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Snapshot Cycle */}
        {hasActiveReset && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-primary">7-Day Snapshot</span>
              <span className="text-xs text-primary">Day {currentResetDay}/7</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <motion.div
                  key={day}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: day * 0.05 + 0.2 }}
                  className={`flex-1 h-2 rounded-full ${
                    day === currentResetDay
                      ? "bg-primary animate-pulse"
                      : day < currentResetDay
                      ? "bg-primary"
                      : "bg-primary/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Your Build State */}
        {currentBuild && archetypeInfo && themeColors ? (
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Dna className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Your Build</span>
            </div>
            <div className={`flex items-center justify-between p-2 rounded-lg ${themeColors.bg} border ${themeColors.border}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{archetypeInfo.emoji}</span>
                <span className={`text-sm font-medium ${themeColors.text}`}>{archetypeInfo.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{currentBuild.overall.toFixed(1)}/4</span>
            </div>
            {lowestInfo && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Focus:</span>
                <span>{lowestInfo.emoji}</span>
                <span className="text-amber-600 dark:text-amber-400">{lowestInfo.label}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-muted/20 border border-dashed border-border/30">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">Build not scanned yet</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
