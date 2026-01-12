import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  totalDays: number;
  currentDay: number;
  completedDays: number;
}

export const ProgressDots = ({ totalDays, currentDay, completedDays }: ProgressDotsProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalDays }, (_, i) => {
        const dayNumber = i + 1;
        const isCompleted = dayNumber <= completedDays;
        const isCurrent = dayNumber === currentDay;

        return (
          <div
            key={dayNumber}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              isCompleted && "bg-primary",
              isCurrent && !isCompleted && "bg-primary/50 ring-2 ring-primary/30",
              !isCompleted && !isCurrent && "bg-muted"
            )}
          />
        );
      })}
    </div>
  );
};
