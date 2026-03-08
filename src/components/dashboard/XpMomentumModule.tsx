import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "./ControllableLevelBadge";

const theme = getControllableTheme("habit");
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionTracking } from "@/hooks/useActionTracking";

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
  compact?: boolean;
}

export function XpMomentumModule({ totalXp, recentLogs, compact = false }: XpMomentumModuleProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { trackModalAction } = useActionTracking();

  const handleDetailOpen = (open: boolean) => {
    setIsDetailOpen(open);
    if (open) {
      trackModalAction("xp_momentum_detail", "open");
    }
  };

  // Calculate level (every 500 XP = 1 level)
  const level = Math.floor(totalXp / 500) + 1;
  const xpInCurrentLevel = totalXp % 500;
  const xpToNextLevel = 500;
  const progressPercent = (xpInCurrentLevel / xpToNextLevel) * 100;

  // Get today's XP
  const today = new Date().toLocaleDateString("sv-SE");
  const todayXp = recentLogs
    .filter((log) => new Date(log.created_at).toLocaleDateString("sv-SE") === today)
    .reduce((sum, log) => sum + log.amount, 0);

  // Get this week's XP
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekXp = recentLogs
    .filter((log) => new Date(log.created_at) >= weekAgo)
    .reduce((sum, log) => sum + log.amount, 0);

  // Compact state indicator version
  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => handleDetailOpen(true)}
          className="w-full text-left p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-card/80 hover:border-border transition-all"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 rounded-md bg-accent/20">
              <Zap className="w-3.5 h-3.5 text-accent" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Momentum</h3>
          </div>

          {/* XP Display */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-display font-bold text-foreground">{totalXp.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>

          {/* Mini level progress */}
          <div className="mb-1">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Level {level}</span>
            {todayXp > 0 && (
              <span className="text-[10px] text-accent flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +{todayXp}
              </span>
            )}
          </div>
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={handleDetailOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Momentum
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Today's XP Badge */}
              {todayXp > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-accent bg-accent/10 rounded-full px-2 py-1 w-fit mx-auto">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{todayXp} today</span>
                </div>
              )}

              {/* XP Display */}
              <div className="text-center">
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-foreground">{totalXp.toLocaleString()}</span>
                  <span className="text-lg text-muted-foreground">XP</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Level {level}</p>
              </div>

              {/* Level Progress */}
              <div>
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

              {/* Recent activity */}
              {recentLogs.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent Activity</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {recentLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1">{log.description || log.source}</span>
                        <span className="text-accent font-medium ml-2">+{log.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full version
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`p-5 rounded-2xl bg-card border shadow-soft ${theme.borderClass}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-habit/10">
          <Zap className="w-4 h-4 text-habit" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Momentum</h3>
        <span className={`ml-auto text-xs font-medium ${theme.textClass}`}>{theme.emoji} {theme.label}</span>
      </div>
      <div className="mb-4" />

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

      {/* Controllable voice tip */}
      <p className="text-xs text-muted-foreground text-center italic mt-3">
        {theme.tip}
      </p>
    </motion.div>
  );
}
