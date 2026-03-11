import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isToday, isBefore, startOfDay, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, Circle, Minus, Calendar, ChevronLeft, ChevronRight, Heart, Moon, Activity, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { HealthMetrics } from "@/hooks/useHealthData";

type PvAStatus = "done" | "partial" | "missed" | "planned";

interface PvAItem {
  id: string;
  title: string;
  plannedTime?: string;
  actualTime?: string;
  status: PvAStatus;
  type: "task" | "time_block" | "routine_instance" | "external_event";
}

interface PvADay {
  date: Date;
  items: PvAItem[];
  health?: HealthMetrics | null;
}

interface PlanVsActualViewProps {
  days: PvADay[];
  onPushToCalendar?: () => void;
  view?: "day" | "week";
  isWearableConnected?: boolean;
}

const statusConfig: Record<PvAStatus, { icon: React.ReactNode; className: string; label: string }> = {
  done: {
    icon: <Check className="w-3.5 h-3.5" />,
    className: "bg-perspective/15 text-perspective border-perspective/30",
    label: "Done",
  },
  partial: {
    icon: <Minus className="w-3.5 h-3.5" />,
    className: "bg-awareness/15 text-awareness border-awareness/30",
    label: "Partial",
  },
  missed: {
    icon: <Circle className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
    label: "Incomplete",
  },
  planned: {
    icon: <Circle className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
    label: "Planned",
  },
};

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function generateObservation(items: PvAItem[], health: HealthMetrics | null | undefined): string | null {
  if (!health) return null;
  const recovery = health.recovery;
  const taskCount = items.length;
  const doneCount = items.filter(i => i.status === "done").length;
  const incompleteCount = items.filter(i => i.status === "missed").length;

  if (recovery !== null && recovery < 33 && taskCount >= 3) {
    return `Low recovery (${Math.round(recovery)}%) — ${taskCount} tasks scheduled. Consider whether output matched effort.`;
  }
  if (recovery !== null && recovery >= 67 && doneCount === taskCount && taskCount > 0) {
    return `Strong recovery (${Math.round(recovery)}%) and ${doneCount}/${taskCount} tasks completed. Great alignment.`;
  }
  if (recovery !== null && recovery >= 67 && incompleteCount > 0) {
    return `Recovery was high (${Math.round(recovery)}%) but ${incompleteCount} tasks incomplete. Energy wasn't the bottleneck.`;
  }
  if (health.sleepMinutes !== null && health.sleepMinutes < 360 && taskCount > 0) {
    return `Short sleep (${formatSleep(health.sleepMinutes)}) — ${doneCount}/${taskCount} completed. Sleep affects follow-through.`;
  }
  if (recovery !== null && taskCount > 0) {
    return `Recovery: ${Math.round(recovery)}% · ${doneCount}/${taskCount} tasks completed.`;
  }
  return null;
}

export const PlanVsActualView = ({
  days,
  onPushToCalendar,
  view: initialView = "day",
  isWearableConnected = false,
}: PlanVsActualViewProps) => {
  const [view, setView] = useState(initialView);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAllCalEvents, setShowAllCalEvents] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  const currentWeekStart = useMemo(
    () => addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7),
    [today, weekOffset]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      const dayData = days.find(
        (d) => format(d.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
      return {
        date,
        items: dayData?.items || [],
        health: dayData?.health,
      };
    });
  }, [currentWeekStart, days]);

  const todayData = useMemo(
    () => days.find((d) => isToday(d.date)) || { date: today, items: [], health: null },
    [days, today]
  );

  const displayDays = view === "day" ? [todayData] : weekDays;

  // Filter items based on calendar toggle
  const filterItems = (items: PvAItem[]): PvAItem[] => {
    if (showAllCalEvents) return items;
    return items.filter(item => item.type !== "external_event");
  };

  // Summary stats for week view
  const weekStats = useMemo(() => {
    const allItems = weekDays.flatMap((d) => filterItems(d.items));
    const done = allItems.filter((i) => i.status === "done").length;
    return {
      total: allItems.length,
      done,
      remaining: allItems.length - done,
    };
  }, [weekDays, showAllCalEvents]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan vs Actual</h3>
          <p className="text-xs text-muted-foreground">
            {view === "day" ? "Today" : format(currentWeekStart, "MMM d") + " – " + format(addDays(currentWeekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Day/Week toggle */}
          <div className="flex bg-muted rounded-md p-0.5 text-xs">
            <button
              onClick={() => setView("day")}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                view === "day" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                view === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Week
            </button>
          </div>

          {onPushToCalendar && (
            <Button variant="ghost" size="sm" onClick={onPushToCalendar} className="gap-1 text-xs">
              <Calendar className="w-3 h-3" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* Calendar filter toggle */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch
            checked={showAllCalEvents}
            onCheckedChange={setShowAllCalEvents}
            className="scale-75 origin-left"
          />
          Show all calendar events
        </label>
      </div>

      {/* Week navigation */}
      {view === "week" && (
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs text-muted-foreground">
            {weekStats.total === weekStats.done ? (
              <span className="text-perspective">All done</span>
            ) : (
              <span>{weekStats.done} completed · {weekStats.remaining} remaining</span>
            )}
          </div>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${view}-${weekOffset}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-3"
        >
          {displayDays.map(({ date, items: rawItems, health }) => {
            const isPast = isBefore(date, today) && !isToday(date);
            const isFuture = isAfter(date, today) && !isToday(date);
            const items = filterItems(rawItems);
            const observation = generateObservation(items, health);
            return (
              <div key={format(date, "yyyy-MM-dd")}>
                {view === "week" && (
                  <div className={cn(
                    "text-xs font-medium mb-1.5",
                    isToday(date) ? "text-accent" : "text-muted-foreground"
                  )}>
                    {isToday(date) ? "Today" : format(date, "EEE d")}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {/* Planned column */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Planned</p>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 py-1">
                        {isPast ? "Nothing tracked" : "Nothing planned"}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {items.map((item) => {
                          const config = statusConfig[item.status];
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px]",
                                config.className
                              )}
                            >
                              {config.icon}
                              <span className="flex-1 truncate font-medium">{item.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actual (wearable) column */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Body</p>
                    {health && (health.recovery !== null || health.sleepMinutes !== null) ? (
                      <div className="space-y-1">
                        {health.recovery !== null && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                            <Heart className="w-3 h-3 text-wellness" />
                            <span className="text-foreground font-medium">Recovery</span>
                            <span className="ml-auto font-mono text-muted-foreground">{Math.round(health.recovery)}%</span>
                          </div>
                        )}
                        {health.sleepMinutes !== null && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                            <Moon className="w-3 h-3 text-accent" />
                            <span className="text-foreground font-medium">Sleep</span>
                            <span className="ml-auto font-mono text-muted-foreground">{formatSleep(health.sleepMinutes)}</span>
                          </div>
                        )}
                        {health.hrv !== null && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                            <Brain className="w-3 h-3 text-awareness" />
                            <span className="text-foreground font-medium">HRV</span>
                            <span className="ml-auto font-mono text-muted-foreground">{Math.round(health.hrv)}ms</span>
                          </div>
                        )}
                        {health.strain !== null && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                            <Activity className="w-3 h-3 text-habit" />
                            <span className="text-foreground font-medium">Strain</span>
                            <span className="ml-auto font-mono text-muted-foreground">{health.strain.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ) : isFuture ? (
                      /* Future day: leave blank */
                      null
                    ) : !isWearableConnected ? (
                      <p className="text-xs text-muted-foreground/60 py-1">
                        Connect WHOOP, Oura, or Fitbit to see your body data here.{" "}
                        <Link to="/integrations" className="underline text-muted-foreground hover:text-foreground">
                          Set up
                        </Link>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 py-1">
                        Wearable data will appear here once synced
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Observation */}
                {observation && (
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-accent/5 border border-accent/10 text-[11px] text-muted-foreground italic">
                    {observation}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
