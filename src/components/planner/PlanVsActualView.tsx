import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isToday, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, Circle, Minus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
}

interface PlanVsActualViewProps {
  days: PvADay[];
  onPushToCalendar?: () => void;
  view?: "day" | "week";
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
    className: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Missed",
  },
  planned: {
    icon: <Circle className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
    label: "Planned",
  },
};

export const PlanVsActualView = ({
  days,
  onPushToCalendar,
  view: initialView = "day",
}: PlanVsActualViewProps) => {
  const [view, setView] = useState(initialView);
  const [weekOffset, setWeekOffset] = useState(0);

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
      };
    });
  }, [currentWeekStart, days]);

  const todayData = useMemo(
    () => days.find((d) => isToday(d.date)) || { date: today, items: [] },
    [days, today]
  );

  const displayDays = view === "day" ? [todayData] : weekDays;

  // Summary stats for week view
  const weekStats = useMemo(() => {
    const allItems = weekDays.flatMap((d) => d.items);
    return {
      total: allItems.length,
      done: allItems.filter((i) => i.status === "done").length,
      missed: allItems.filter((i) => i.status === "missed").length,
      planned: allItems.filter((i) => i.status === "planned").length,
    };
  }, [weekDays]);

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

      {/* Week navigation */}
      {view === "week" && (
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="text-perspective">{weekStats.done} done</span>
            <span className="text-destructive">{weekStats.missed} missed</span>
            <span>{weekStats.planned} planned</span>
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
          {displayDays.map(({ date, items }) => {
            const isPast = isBefore(date, today) && !isToday(date);
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
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs",
                            config.className
                          )}
                        >
                          {config.icon}
                          <span className="flex-1 truncate font-medium">{item.title}</span>
                          {item.plannedTime && (
                            <span className="text-[10px] opacity-70">
                              {item.plannedTime}
                              {item.actualTime && item.actualTime !== item.plannedTime && (
                                <> → {item.actualTime}</>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
