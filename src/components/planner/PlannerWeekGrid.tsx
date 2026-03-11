import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { PlannerItem } from "@/hooks/usePlanner";
import { CheckCircle2, Circle, SkipForward } from "lucide-react";

interface PlannerWeekGridProps {
  days: Date[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
  itemsByDate: Record<string, PlannerItem[]>;
  activityByDate?: Record<string, { id: string; isConfirmed: boolean }[]>;
  mealCountsByDate?: Record<string, number>;
}

const miniStatusIcon = {
  todo: <Circle className="h-3 w-3 text-muted-foreground" />,
  in_progress: <Circle className="h-3 w-3 text-accent" />,
  done: <CheckCircle2 className="h-3 w-3 text-perspective" />,
  skipped: <SkipForward className="h-3 w-3 text-muted-foreground/50" />,
};

export const PlannerWeekGrid = ({
  days,
  selectedDate,
  onSelect,
  itemsByDate,
  activityByDate = {},
  mealCountsByDate = {},
}: PlannerWeekGridProps) => {
  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const items = itemsByDate[dateKey] ?? [];
        const activity = activityByDate[dateKey] ?? [];
        const mealCount = mealCountsByDate[dateKey] ?? 0;
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={dateKey}
            onClick={() => onSelect(day)}
            className={cn(
              "flex flex-col p-2 min-h-[120px] bg-card hover:bg-muted/50 transition-colors text-left",
              selected && "ring-2 ring-inset ring-primary",
              today && !selected && "bg-accent/5"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  today ? "text-accent" : "text-muted-foreground"
                )}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  today
                    ? "bg-accent text-accent-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
            </div>

            <div className="flex-1 space-y-0.5 overflow-hidden">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-1 min-w-0">
                  {miniStatusIcon[item.status]}
                  <span className="text-[11px] truncate text-foreground/80">
                    {item.title}
                  </span>
                </div>
              ))}
              {activity.length > 0 && (
                <div className="flex items-center gap-1 min-w-0">
                  <CheckCircle2 className="h-3 w-3 text-accent" />
                  <span className="text-[11px] truncate text-muted-foreground">
                    {activity.filter(a => a.isConfirmed).length} logged
                  </span>
                </div>
              )}
              {mealCount > 0 && (
                <div className="flex items-center gap-0.5 min-w-0">
                  <span className="text-[10px]">🍽️</span>
                  <span className="text-[10px] text-muted-foreground">{mealCount} meals</span>
                </div>
              )}
              {(items.length + activity.length) > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{items.length + activity.length - 4} more
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
