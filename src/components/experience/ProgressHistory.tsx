import { motion } from "framer-motion";
import { TrendingUp, Zap, RefreshCw, Award, ChevronRight } from "lucide-react";
import { format, subDays } from "date-fns";

interface XpLog {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface ResetSession {
  id: string;
  start_date: string;
  status: string;
  completed_at: string | null;
  current_day: number;
}

interface ProgressHistoryProps {
  totalXp: number;
  xpLogs: XpLog[];
  resetSessions: ResetSession[];
  completedResetsCount: number;
}

export function ProgressHistory({ totalXp, xpLogs, resetSessions, completedResetsCount }: ProgressHistoryProps) {
  // Calculate XP trends (last 7 days vs previous 7 days)
  const now = new Date();
  const last7Days = xpLogs.filter(log => 
    new Date(log.created_at) >= subDays(now, 7)
  );
  const previous7Days = xpLogs.filter(log => {
    const date = new Date(log.created_at);
    return date >= subDays(now, 14) && date < subDays(now, 7);
  });
  
  const last7DaysXp = last7Days.reduce((sum, log) => sum + log.amount, 0);
  const previous7DaysXp = previous7Days.reduce((sum, log) => sum + log.amount, 0);
  const xpTrend = previous7DaysXp > 0 
    ? Math.round(((last7DaysXp - previous7DaysXp) / previous7DaysXp) * 100)
    : last7DaysXp > 0 ? 100 : 0;

  // XP level calculation
  const getLevel = (xp: number) => Math.floor(xp / 500) + 1;
  const currentLevel = getLevel(totalXp);
  const xpForNextLevel = currentLevel * 500;
  const xpProgress = ((totalXp % 500) / 500) * 100;

  // Recent activity grouped by source
  const activityBySource = xpLogs.slice(0, 20).reduce((acc, log) => {
    const source = log.source.replace(/_/g, " ");
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/10 to-primary/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Progress History</h3>
            <p className="text-xs text-muted-foreground">Your value gained over time</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* XP & Level */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="font-display font-bold text-2xl text-foreground">{totalXp.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">XP</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-accent">Level {currentLevel}</p>
              <p className="text-xs text-muted-foreground">{xpForNextLevel - totalXp} to next</p>
            </div>
          </div>
          
          <div className="h-2 bg-accent/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          
          {xpTrend !== 0 && (
            <div className={`mt-2 flex items-center gap-1 text-xs ${xpTrend > 0 ? "text-green-500" : "text-red-400"}`}>
              <TrendingUp className={`w-3 h-3 ${xpTrend < 0 ? "rotate-180" : ""}`} />
              <span>{xpTrend > 0 ? "+" : ""}{xpTrend}% vs last week</span>
            </div>
          )}
        </div>

        {/* Resets History */}
        <div className="p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground text-sm">Resets Recorded</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-background/50">
              <p className="text-xl font-display font-bold text-primary">{resetSessions.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-2 rounded-lg bg-background/50">
              <p className="text-xl font-display font-bold text-green-500">{completedResetsCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="p-2 rounded-lg bg-background/50">
              <p className="text-xl font-display font-bold text-muted-foreground">
                {resetSessions.length - completedResetsCount}
              </p>
              <p className="text-xs text-muted-foreground">Abandoned</p>
            </div>
          </div>
        </div>

        {/* Recent Activity Summary */}
        {Object.keys(activityBySource).length > 0 && (
          <div className="p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground text-sm">Recent Activity</span>
            </div>
            
            <div className="space-y-2">
              {Object.entries(activityBySource).slice(0, 4).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{source}</span>
                  <span className="font-medium text-foreground">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent XP Logs */}
        {xpLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent XP</p>
            {xpLogs.slice(0, 5).map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-accent" />
                  <span className="text-sm text-foreground">+{log.amount} XP</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "MMM d")}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
