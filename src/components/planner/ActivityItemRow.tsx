import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Target, Heart, UtensilsCrossed, Zap } from "lucide-react";
import type { ActivityItem } from "@/hooks/usePlannerActivity";

const sourceConfig = {
  ring: { icon: Target, color: "border-accent" },
  wellness: { icon: Heart, color: "border-destructive" },
  meal: { icon: UtensilsCrossed, color: "border-primary" },
  action: { icon: Zap, color: "border-perspective" },
} as const;

export const ActivityItemRow = ({ item }: { item: ActivityItem }) => {
  const config = sourceConfig[item.source];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-lg border-l-[3px] bg-card transition-opacity",
        item.isConfirmed
          ? cn(config.color, "opacity-100 border-solid")
          : "border-muted-foreground/30 opacity-40 border-dashed"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {item.isConfirmed ? (
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {item.title}
          </span>
        </div>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
