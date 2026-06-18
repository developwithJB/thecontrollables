import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Compass, Wind, X } from "lucide-react";
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

const compactText = (value: string, maxWords = 9): string => {
  const words = value.trim().split(/\s+/);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}...`;
};

export function ReturnFromDriftCard({
  drift,
  onDismiss,
}: ReturnFromDriftCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const levelCopy = LEVEL_COPY[drift.driftLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card px-5 py-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
            ↻
          </span>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Drift Signal
              </span>
              <Badge variant="outline" className={levelCopy.badgeClass}>
                {levelCopy.label}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                {drift.alignmentScore}
              </Badge>
            </div>
            <p className="font-display text-lg font-semibold leading-tight text-foreground">
              Re-center now
            </p>
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

      <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          <Compass className="w-4 h-4 text-awareness" />
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Grounding Move
          </p>
        </div>
        <p className="text-sm font-medium leading-relaxed text-foreground">
          {compactText(drift.groundingMoveNow, 11)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {drift.primaryDriftDrivers.slice(0, 3).map((driver) => (
          <span
            key={driver.id}
            className="rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground"
            title={driver.detail}
          >
            {driver.label}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30"
      >
        <span>View details</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDetails ? "rotate-180" : ""}`} />
      </button>

      {showDetails ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/25 px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground">{drift.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{drift.supportLine}</p>
          </div>

          {drift.primaryDriftDrivers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Signals
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
                  Ground
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
                  Recover
                </p>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {drift.recoveryMoveToday}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
