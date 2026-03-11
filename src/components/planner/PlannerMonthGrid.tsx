import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { PlannerItem } from "@/hooks/usePlanner";

interface PlannerMonthGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  itemsByDate: Record<string, PlannerItem[]>;
  activityByDate?: Record<string, { id: string; isConfirmed: boolean }[]>;
}

export const PlannerMonthGrid = ({
  currentMonth,
  selectedDate,
  onSelectDate,
  itemsByDate,
  activityByDate = {},
}: PlannerMonthGridProps) => {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const items = itemsByDate[dateKey] ?? [];
          const activity = activityByDate[dateKey] ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const totalEvents = items.length + activity.length;

          // Get up to 3 event chips
          const chips = items.slice(0, 3);

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex flex-col items-start p-1 min-h-[60px] sm:min-h-[80px] rounded-md transition-colors text-left",
                inMonth ? "bg-card" : "bg-muted/30",
                selected && "ring-2 ring-primary ring-inset",
                !inMonth && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
                  today
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="w-full space-y-px overflow-hidden flex-1">
                {chips.map((item) => (
                  <div
                    key={item.id}
                    className="text-[9px] leading-tight truncate rounded px-0.5 py-px"
                    style={{
                      backgroundColor:
                        item.status === "done"
                          ? "hsl(var(--perspective) / 0.15)"
                          : "hsl(var(--accent) / 0.12)",
                      color:
                        item.status === "done"
                          ? "hsl(var(--perspective))"
                          : "hsl(var(--accent))",
                    }}
                  >
                    {item.title}
                  </div>
                ))}
                {totalEvents > 3 && (
                  <span className="text-[9px] text-muted-foreground pl-0.5">
                    +{totalEvents - 3} more
                  </span>
                )}
              </div>

              {/* Dot indicators for days with items but no visible chips */}
              {totalEvents > 0 && chips.length === 0 && (
                <div className="flex gap-0.5 mt-auto">
                  <div className="w-1 h-1 rounded-full bg-accent" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
