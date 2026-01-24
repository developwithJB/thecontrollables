import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";

interface GreetingBannerProps {
  totalXp: number;
  streakDays?: number;
  visitCount: number;
}

export function GreetingBanner({ totalXp, streakDays = 0, visitCount }: GreetingBannerProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Calculate level from XP
  const level = Math.floor(totalXp / 500) + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {/* Main greeting */}
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        {getGreeting()}
      </h1>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        {/* Streak indicator */}
        {streakDays > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-orange-500/10">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-foreground">{streakDays}</span>
            <span className="text-sm text-muted-foreground">day streak</span>
          </div>
        )}

        {/* XP/Level indicator */}
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-accent/10">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground">Level {level}</span>
          <span className="text-sm text-muted-foreground">• {totalXp.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Intentional check-in message for new users */}
      {visitCount <= 5 && (
        <p className="text-xs text-muted-foreground/70 mt-3">
          Designed for intentional check-ins. Desktop or mobile.
        </p>
      )}
    </motion.div>
  );
}
