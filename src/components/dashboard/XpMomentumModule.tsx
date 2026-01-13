import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";

interface XpLog {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface XpMomentumModuleProps {
  totalXp: number;
  recentLogs: XpLog[];
}

export function XpMomentumModule({ totalXp, recentLogs }: XpMomentumModuleProps) {
  // Calculate level (every 500 XP = 1 level)
  const level = Math.floor(totalXp / 500) + 1;
  const xpInCurrentLevel = totalXp % 500;
  const xpToNextLevel = 500;
  const progressPercent = (xpInCurrentLevel / xpToNextLevel) * 100;

  // Get today's XP
  const today = new Date().toISOString().split("T")[0];
  const todayXp = recentLogs
    .filter((log) => log.created_at.startsWith(today))
    .reduce((sum, log) => sum + log.amount, 0);

  // Get this week's XP
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekXp = recentLogs
    .filter((log) => new Date(log.created_at) >= weekAgo)
    .reduce((sum, log) => sum + log.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-5 rounded-2xl bg-card border shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-accent/20">
          <Zap className="w-4 h-4 text-accent" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Momentum</h3>
      </div>

      {/* Today's XP Badge */}
      {todayXp > 0 && (
        <div className="flex items-center justify-center gap-1 text-xs text-accent bg-accent/10 rounded-full px-2 py-1 mb-3 w-fit mx-auto">
          <TrendingUp className="w-3 h-3" />
          <span>+{todayXp} today</span>
        </div>
      )}

      {/* XP Display */}
      <div className="text-center mb-4">
        <div className="inline-flex items-baseline gap-1">
          <span className="text-4xl font-display font-bold text-foreground">{totalXp.toLocaleString()}</span>
          <span className="text-lg text-muted-foreground">XP</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Level {level}</p>
      </div>

      {/* Level Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{xpInCurrentLevel} / {xpToNextLevel} XP</span>
          <span>Level {level + 1}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-accent rounded-full"
          />
        </div>
      </div>

      {/* Weekly summary */}
      <div className="pt-3 border-t text-center">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{weekXp} XP</span> earned this week
        </p>
      </div>
    </motion.div>
  );
}
