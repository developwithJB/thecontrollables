import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ChevronUp, Target, Heart, UtensilsCrossed, Zap, Battery, Scan } from "lucide-react";
import type { ActivityItem } from "@/hooks/usePlannerActivity";

const sourceConfig: Record<string, { icon: React.ElementType; color: string }> = {
  ring: { icon: Target, color: "border-accent" },
  wellness: { icon: Heart, color: "border-destructive" },
  meal: { icon: UtensilsCrossed, color: "border-primary" },
  action: { icon: Zap, color: "border-[hsl(var(--perspective))]" },
  recharge: { icon: Battery, color: "border-[hsl(var(--wellness))]" },
  notice: { icon: Scan, color: "border-[hsl(var(--awareness))]" },
};

export const ActivityItemRow = ({ item }: { item: ActivityItem }) => {
  const [expanded, setExpanded] = useState(false);
  const config = sourceConfig[item.source] || sourceConfig.action;
  const Icon = config.icon;
  const hasDetail = !!item.detail || (item.meta && Object.keys(item.meta).length > 0);

  return (
    <div
      className={cn(
        "rounded-lg border-l-[3px] bg-card transition-all",
        config.color, "opacity-100 border-solid"
      )}
    >
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        className={cn(
          "flex items-start gap-3 px-3 py-2.5 w-full text-left",
          hasDetail && "cursor-pointer hover:bg-muted/30"
        )}
      >
        <div className="mt-0.5 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {item.title}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.subtitle}
            </p>
          )}

          {/* Inline wellness bars */}
          {item.source === "wellness" && item.meta && (
            <div className="flex gap-3 mt-1.5">
              {[
                { label: "Sleep", value: item.meta.sleep, color: "bg-blue-400" },
                { label: "Move", value: item.meta.movement, color: "bg-green-400" },
                { label: "Food", value: item.meta.nutrition, color: "bg-orange-400" },
              ].map(({ label, value, color }) => value != null && (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={cn("w-1.5 h-3 rounded-sm", n <= value ? color : "bg-muted")} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notice mood/energy inline */}
          {item.source === "notice" && item.meta && (
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.meta.mood}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">⚡ {item.meta.energy}/5</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">🔥 {item.meta.stress}/5</span>
            </div>
          )}
        </div>

        {hasDetail && (
          <div className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && item.detail && (
        <div className="px-3 pb-2.5 pl-10">
          <p className="text-xs text-muted-foreground whitespace-pre-line">{item.detail}</p>
        </div>
      )}
    </div>
  );
};
