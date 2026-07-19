import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import { useTimelineDay } from "@/hooks/useTimeline";
import { APP_ROUTES } from "@/lib/appRoutes";
import { CONTROLLABLE_LABELS, TIMELINE_CONTROLLABLES, getEventNetImpact } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const BAR_STYLES = {
  awareness: "bg-sky-400",
  perspective: "bg-emerald-400",
  habit: "bg-blue-400",
  wellness: "bg-fuchsia-400",
  environment: "bg-orange-400",
} as const;

export const DailyChargeTimelinePreview = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const localDate = new Date().toLocaleDateString("sv-SE");
  const { events, snapshot, isLoading, isError } = useTimelineDay(userId, localDate);

  if (isError) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(APP_ROUTES.timeline)}
      className="dashboard-os-card w-full overflow-hidden rounded-xl border border-border/70 bg-card/70 text-left transition-colors hover:border-primary/35"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10">
          <Clock3 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your Day</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums">{isLoading ? "--" : snapshot.overallScore}</span>
            <span className="text-xs text-muted-foreground">Daily Charge</span>
            {!isLoading && snapshot.netImpact !== 0 ? (
              <span className={cn("text-xs font-semibold", snapshot.netImpact > 0 ? "text-emerald-300" : "text-rose-300")}>
                {snapshot.netImpact > 0 ? "+" : ""}{snapshot.netImpact}
              </span>
            ) : null}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-5 gap-2 border-t border-border/60 px-4 py-3">
        {TIMELINE_CONTROLLABLES.map((controllable) => (
          <div key={controllable} className="min-w-0">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", BAR_STYLES[controllable])} style={{ width: `${snapshot.categoryScores[controllable]}%` }} />
            </div>
            <p className="mt-1 truncate text-[9px] text-muted-foreground">{CONTROLLABLE_LABELS[controllable]}</p>
          </div>
        ))}
      </div>

      {events.length ? (
        <div className="border-t border-border/60 px-4 py-2.5">
          {events.slice(0, 2).map((event) => {
            const delta = getEventNetImpact(event);
            return (
              <div key={event.id} className="flex min-w-0 items-center gap-2 py-1 text-xs">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{event.title}</span>
                <span className={cn("shrink-0 font-semibold", delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-muted-foreground")}>
                  {delta > 0 ? "+" : ""}{delta || "Neutral"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </button>
  );
};
