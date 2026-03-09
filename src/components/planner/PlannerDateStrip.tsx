import { format, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlannerDateStripProps {
  days: Date[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  itemCounts?: Record<string, number>;
}

export const PlannerDateStrip = ({
  days,
  selectedDate,
  onSelect,
  onPrevWeek,
  onNextWeek,
  itemCounts = {},
}: PlannerDateStripProps) => {
  return (
    <div className="flex items-center gap-1 px-2 py-3 bg-card border-b border-border">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onPrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-hide">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const count = itemCounts[dateKey] ?? 0;

          return (
            <button
              key={dateKey}
              onClick={() => onSelect(day)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] py-1.5 px-2 rounded-lg transition-all",
                selected
                  ? "bg-primary text-primary-foreground"
                  : today
                    ? "bg-accent/20 text-accent-foreground"
                    : "hover:bg-muted text-muted-foreground"
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {format(day, "EEE")}
              </span>
              <span className={cn("text-lg font-semibold", selected ? "text-primary-foreground" : "text-foreground")}>
                {format(day, "d")}
              </span>
              {count > 0 && (
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    selected ? "bg-primary-foreground/70" : "bg-accent"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
