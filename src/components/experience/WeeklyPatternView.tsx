import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Calendar,
  Zap,
  Target,
  Clock,
  Sparkles,
  Brain,
  Lightbulb,
} from "lucide-react";
import { format, parseISO, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useInsights } from "@/hooks/useInsights";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
}

interface WeeklyPatternViewProps {
  snapshots: SnapshotRecord[];
  className?: string;
  userId?: string;
  isPaid?: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayPattern {
  dayIndex: number;
  dayName: string;
  actionsCount: number;
  xpEarned: number;
  checkInCount: number;
  productivity: number; // 0-100 score
}

export function WeeklyPatternView({ snapshots, className, userId, isPaid = false }: WeeklyPatternViewProps) {
  // Fetch actual activity data from DB
  const { data: activityData } = useQuery({
    queryKey: ["pattern-activity-data", userId],
    queryFn: async () => {
      if (!userId) return { actions: [], xpLogs: [] };

      const [actionsResult, xpResult] = await Promise.all([
        supabase
          .from("completed_actions")
          .select("completed_at, xp_awarded, controllable")
          .eq("user_id", userId),
        supabase
          .from("xp_logs")
          .select("amount, created_at, source")
          .eq("user_id", userId),
      ]);

      return {
        actions: actionsResult.data || [],
        xpLogs: xpResult.data || [],
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Get AI insights for premium users
  const { data: aiInsight, isLoading: insightLoading } = useInsights(userId, isPaid);

  // Calculate patterns across all snapshots + actual activity
  const patterns = useMemo(() => {
    const dayStats: Record<number, { actions: number; xp: number; checkIns: number; snapshotDays: number }> = {};
    
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { actions: 0, xp: 0, checkIns: 0, snapshotDays: 0 };
    }

    // Process snapshots - map day_number (1-7) to day of week based on start date
    snapshots.forEach((snapshot) => {
      const startDate = parseISO(snapshot.startDate);
      const startDayOfWeek = getDay(startDate); // 0 = Sunday
      
      // For each day completed in this snapshot
      for (let day = 1; day <= snapshot.daysCompleted; day++) {
        const actualDayOfWeek = (startDayOfWeek + day - 1) % 7;
        dayStats[actualDayOfWeek].snapshotDays++;
        dayStats[actualDayOfWeek].checkIns++;
      }
    });

    // Process actual activity data from DB
    if (activityData) {
      activityData.actions.forEach((action) => {
        const actionDay = getDay(parseISO(action.completed_at));
        dayStats[actionDay].actions++;
        dayStats[actionDay].xp += action.xp_awarded || 0;
      });

      // Also count XP from xp_logs
      activityData.xpLogs.forEach((log) => {
        const logDay = getDay(parseISO(log.created_at));
        // Only add XP that's not already counted from actions
        if (log.source !== "action_complete") {
          dayStats[logDay].xp += log.amount || 0;
        }
      });
    }

    // Calculate patterns
    const result: DayPattern[] = DAY_NAMES.map((name, idx) => {
      const stats = dayStats[idx];
      const totalOccurrences = stats.snapshotDays || 1;
      const productivity = Math.min(100, Math.round(
        ((stats.actions / totalOccurrences) * 30) +
        ((stats.checkIns / totalOccurrences) * 40) +
        ((stats.xp / totalOccurrences) * 0.3)
      ));

      return {
        dayIndex: idx,
        dayName: name,
        actionsCount: stats.actions,
        xpEarned: stats.xp,
        checkInCount: stats.checkIns,
        productivity,
      };
    });

    return result;
  }, [snapshots, activityData]);

  // Find the most productive day
  const mostProductiveDay = useMemo(() => {
    return patterns.reduce((best, day) => 
      day.productivity > best.productivity ? day : best
    , patterns[0]);
  }, [patterns]);

  // Find common patterns
  const insights = useMemo(() => {
    const sorted = [...patterns].sort((a, b) => b.productivity - a.productivity);
    const topDays = sorted.slice(0, 2);
    const lowDays = sorted.slice(-2).reverse();
    
    const weekdayAvg = patterns
      .filter((_, i) => i >= 1 && i <= 5)
      .reduce((sum, d) => sum + d.productivity, 0) / 5;
    
    const weekendAvg = (patterns[0].productivity + patterns[6].productivity) / 2;
    
    return {
      topDays,
      lowDays,
      weekdayAvg: Math.round(weekdayAvg),
      weekendAvg: Math.round(weekendAvg),
      isWeekdayStronger: weekdayAvg > weekendAvg,
    };
  }, [patterns]);

  // Total stats - combine snapshot data with actual DB data
  const totalStats = useMemo(() => {
    const fromPatterns = {
      totalCheckIns: patterns.reduce((sum, d) => sum + d.checkInCount, 0),
      snapshotsAnalyzed: snapshots.length,
    };

    // Get totals from actual activity data
    const totalActions = activityData?.actions.length || 0;
    const totalXP = activityData?.xpLogs.reduce((sum, log) => sum + log.amount, 0) || 0;

    return {
      ...fromPatterns,
      totalActions,
      totalXP,
    };
  }, [patterns, snapshots, activityData]);

  if (snapshots.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Complete 2+ Snapshots to see your patterns
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Weekly Patterns
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on {totalStats.snapshotsAnalyzed} Snapshots
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* AI Personalized Insight - Premium Feature */}
        {isPaid && aiInsight?.insight && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-emerald-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider mb-1">
                  Your Personal Insight
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {aiInsight.insight}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Updated {format(parseISO(aiInsight.generated_at), "MMM d")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show loading state for insights */}
        {isPaid && insightLoading && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade prompt for free users */}
        {!isPaid && (
          <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock personalized AI insights based on your unique patterns and behavior.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Day-of-week heatmap */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Activity by Day
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {patterns.map((day) => {
              const intensity = day.productivity / 100;
              return (
                <div
                  key={day.dayIndex}
                  className="text-center"
                >
                  <div
                    className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.7})`,
                      color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                    }}
                  >
                    {day.checkInCount > 0 ? day.checkInCount : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{day.dayName}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most productive day highlight */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most productive day</p>
              <p className="text-lg font-semibold text-foreground">
                {DAY_NAMES_FULL[mostProductiveDay.dayIndex]}
              </p>
            </div>
          </div>
        </div>

        {/* Pattern insights */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Insights
          </p>
          
          <div className="space-y-2">
            {/* Weekday vs Weekend */}
            <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {insights.isWeekdayStronger ? "Stronger on weekdays" : "Stronger on weekends"}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {insights.isWeekdayStronger ? "Weekday" : "Weekend"} focus
              </Badge>
            </div>

            {/* Top days */}
            {insights.topDays[0].checkInCount > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-foreground">
                    Peak days: {insights.topDays.map(d => d.dayName).join(" & ")}
                  </span>
                </div>
              </div>
            )}

            {/* Low days - framed positively */}
            {insights.lowDays[0].productivity < insights.topDays[0].productivity && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-foreground">
                    Rest days: {insights.lowDays.map(d => d.dayName).join(" & ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-foreground">{totalStats.totalCheckIns}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-foreground">{totalStats.totalActions}</p>
            <p className="text-xs text-muted-foreground">Actions</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              {totalStats.totalXP.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>

        {/* Philosophy note */}
        <p className="text-xs text-muted-foreground text-center italic pt-2">
          Patterns reveal rhythm, not rules. Use them to work with your natural flow.
        </p>
      </CardContent>
    </Card>
  );
}
