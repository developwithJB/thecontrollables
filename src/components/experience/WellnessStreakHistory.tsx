import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import type { WellnessLog } from "@/hooks/useWellness";

interface WellnessStreakHistoryProps {
  recentLogs: WellnessLog[];
  streak: number;
}

export function WellnessStreakHistory({ recentLogs, streak }: WellnessStreakHistoryProps) {
  // Build a set of logged dates for O(1) lookup
  const loggedDatesMap = useMemo(() => {
    const map = new Map<string, WellnessLog>();
    recentLogs.forEach((log) => {
      map.set(log.log_date, log);
    });
    return map;
  }, [recentLogs]);

  // Calculate longest streak from all logs
  const longestStreak = useMemo(() => {
    if (recentLogs.length === 0) return 0;

    const dates = [...new Set(recentLogs.map((l) => l.log_date))].sort();
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const curr = new Date(dates[i]).getTime();
      const prev = new Date(dates[i - 1]).getTime();
      if (curr - prev === 86400000) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    return Math.max(maxStreak, currentStreak);
  }, [recentLogs]);

  // Generate 12 weeks of dates (84 days) for the heatmap
  // Starting from the most recent Monday, going back
  const heatmapData = useMemo(() => {
    const today = new Date();
    const endOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const weeks: Date[][] = [];

    // Generate 12 weeks
    for (let w = 11; w >= 0; w--) {
      const weekStart = subDays(endOfCurrentWeek, w * 7);
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(addDays(weekStart, d));
      }
      weeks.push(week);
    }

    return weeks;
  }, []);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totalLogs = recentLogs.length;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-wellness" />
            <span>Wellness Rhythm</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-sm font-medium text-wellness">
              <Flame className="w-4 h-4" />
              <span>{streak}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Heatmap Grid */}
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] text-[9px] text-muted-foreground pr-1">
              {dayLabels.map((label) => (
                <div key={label} className="h-3 flex items-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex gap-[2px] flex-1">
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px] flex-1">
                  {week.map((date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const log = loggedDatesMap.get(dateStr);
                    const isLogged = !!log;
                    const isFuture = date > new Date();

                    const avgRating = log
                      ? (
                          ((log.sleep_rating || 0) +
                            (log.movement_rating || 0) +
                            (log.nutrition_rating || 0)) /
                          3
                        ).toFixed(1)
                      : null;

                    return (
                      <Tooltip key={dateStr}>
                        <TooltipTrigger asChild>
                          <div
                            className={`
                              h-3 rounded-[2px] transition-colors
                              ${
                                isFuture
                                  ? "bg-muted/20"
                                  : isLogged
                                  ? "bg-wellness"
                                  : "bg-muted/30"
                              }
                            `}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{format(date, "MMM d, yyyy")}</p>
                          {isLogged && avgRating && (
                            <p className="text-muted-foreground">
                              Avg rating: {avgRating}/5
                            </p>
                          )}
                          {!isLogged && !isFuture && (
                            <p className="text-muted-foreground">No log</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>

        {/* Stats footer */}
        <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>Longest: {longestStreak} days</span>
          <span>Total: {totalLogs} logs</span>
        </div>
      </CardContent>
    </Card>
  );
}
