import { motion } from "framer-motion";
import { Compass, RefreshCcw, Wind, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DriftAlignmentResult } from "@/lib/driftAlignment";

interface ReturnFromDriftCardProps {
  drift: DriftAlignmentResult;
  onDismiss: () => void;
}

const LEVEL_COPY: Record<
  DriftAlignmentResult["driftLevel"],
  { label: string; badgeClass: string }
> = {
  low: {
    label: "Low Drift",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
  moderate: {
    label: "Moderate Drift",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  },
  high: {
    label: "High Drift",
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-600",
  },
};

export function ReturnFromDriftCard({
  drift,
  onDismiss,
}: ReturnFromDriftCardProps) {
  const levelCopy = LEVEL_COPY[drift.driftLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card px-5 py-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-primary/70" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Return From Drift
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={levelCopy.badgeClass}>
              {levelCopy.label}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Alignment {drift.alignmentScore}
            </Badge>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50"
          aria-label="Dismiss return from drift"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-base leading-relaxed text-foreground">
          {drift.headline}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {drift.supportLine}
        </p>
      </div>

      {drift.primaryDriftDrivers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Likely Causes Of Drift
          </p>
          <div className="space-y-2">
            {drift.primaryDriftDrivers.map((driver) => (
              <div
                key={driver.id}
                className="rounded-xl border border-border/50 bg-background/40 px-3 py-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {driver.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {driver.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-awareness" />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Grounding Move Now
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {drift.groundingMoveNow}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-primary/70" />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Recovery Move For Today
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {drift.recoveryMoveToday}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
