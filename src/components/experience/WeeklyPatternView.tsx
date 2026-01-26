import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Calendar,
  Zap,
  Target,
  Clock,
  Sparkles,
} from "lucide-react";
import { format, parseISO, getDay } from "date-fns";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
}

interface CompletedAction {
  completed_at: string;
  xp_awarded: number;
  controllable: string | null;
}

interface DailyReset {
  day_number: number;
  completed_at: string;
}

interface WeeklyPatternData {
  completedActions: CompletedAction[];
  dailyResets: DailyReset[];
}

interface WeeklyPatternViewProps {
  snapshots: SnapshotRecord[];
  activityData?: WeeklyPatternData[];
  className?: string;
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

export function WeeklyPatternView({ snapshots, activityData, className }: WeeklyPatternViewProps) {
  // Calculate patterns across all snapshots
  const patterns = useMemo(() => {
    const dayStats: Record<number, { actions: number; xp: number; checkIns: number; snapshotDays: number }> = {};
    
    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { actions: 0, xp: 0, checkIns: 0, snapshotDays: 0 };
    }

    // Process snapshots - map day_number (1-7) to day of week based on start date
    snapshots.forEach((snapshot, snapshotIndex) => {
      const startDate = parseISO(snapshot.startDate);
      const startDayOfWeek = getDay(startDate); // 0 = Sunday
      
      // For each day completed in this snapshot
      for (let day = 1; day <= snapshot.daysCompleted; day++) {
        const actualDayOfWeek = (startDayOfWeek + day - 1) % 7;
        dayStats[actualDayOfWeek].snapshotDays++;
        dayStats[actualDayOfWeek].checkIns++;
      }

      // Process activity data if provided
      if (activityData && activityData[snapshotIndex]) {
        const data = activityData[snapshotIndex];
        
        data.completedActions.forEach((action) => {
          const actionDay = getDay(parseISO(action.completed_at));
          dayStats[actionDay].actions++;
          dayStats[actionDay].xp += action.xp_awarded;
        });
      }
    });

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

  // Total stats
  const totalStats = useMemo(() => ({
    totalActions: patterns.reduce((sum, d) => sum + d.actionsCount, 0),
    totalXP: patterns.reduce((sum, d) => sum + d.xpEarned, 0),
    totalCheckIns: patterns.reduce((sum, d) => sum + d.checkInCount, 0),
    snapshotsAnalyzed: snapshots.length,
  }), [patterns, snapshots]);

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
              {totalStats.totalXP}
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
