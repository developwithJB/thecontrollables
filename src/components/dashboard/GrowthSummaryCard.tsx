import { motion } from "framer-motion";
import { TrendingUp, Zap, Flame, Target } from "lucide-react";
import type { UserBuildCurrent } from "@/lib/build";

interface GrowthSummaryCardProps {
  totalXp: number;
  actionsCompleted: number;
  streakDays: number;
  currentBuild?: UserBuildCurrent | null;
}

const CONTROLLABLE_LABELS: Record<string, { label: string; emoji: string }> = {
  awareness: { label: "Awareness", emoji: "🦉" },
  perspective: { label: "Perspective", emoji: "🐢" },
  habit: { label: "Habit", emoji: "🦈" },
  wellness: { label: "Wellness", emoji: "🛰️" },
  environment: { label: "Environment", emoji: "🚀" },
};

function getStrongestControllable(build: UserBuildCurrent): { label: string; emoji: string; score: number } | null {
  const scores: Record<string, number> = {
    awareness: Number(build.awareness),
    perspective: Number(build.perspective),
    habit: Number(build.habit),
    wellness: Number(build.wellness),
    environment: Number(build.environment),
  };

  let maxKey = "";
  let maxScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxKey = key;
    }
  }

  if (!maxKey || maxScore === 0) return null;
  const info = CONTROLLABLE_LABELS[maxKey];
  return info ? { ...info, score: maxScore } : null;
}

export function GrowthSummaryCard({
  totalXp,
  actionsCompleted,
  streakDays,
  currentBuild,
}: GrowthSummaryCardProps) {
  const strongest = currentBuild && Number(currentBuild.overall) > 0
    ? getStrongestControllable(currentBuild)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl bg-card border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-medium text-foreground">Your Growth</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Zap className="w-3.5 h-3.5 text-accent" />
          </div>
          <p className="font-display font-bold text-foreground">{totalXp}</p>
          <p className="text-[10px] text-muted-foreground">XP earned</p>
        </div>

        {streakDays > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <p className="font-display font-bold text-foreground">{streakDays}d</p>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
        )}

        {strongest && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="text-sm">{strongest.emoji}</span>
            </div>
            <p className="font-display font-bold text-foreground">{strongest.score.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">{strongest.label}</p>
          </div>
        )}

        {!strongest && streakDays === 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">{actionsCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Actions</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
