import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { ControllableType } from "@/components/ControllableCard";
import { ChargeProgressRing } from "@/components/dashboard/ControllableChargeVisual";
import { getChargeMomentDisplay, getControllableChargeVisual } from "@/lib/controllableVisuals";

interface ChargeMomentProps {
  type: ControllableType;
  xpAwarded: number;
  progress: number;
  totalXp: number;
  level?: number;
}

export function ChargeMoment({
  type,
  xpAwarded,
  progress,
  totalXp,
  level = 1,
}: ChargeMomentProps) {
  const moment = getChargeMomentDisplay({ type, xpAwarded, progress, totalXp, level });
  const visual = getControllableChargeVisual({ type, level, progress, totalXp });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="dashboard-os-card relative overflow-hidden rounded-2xl p-3"
      style={{
        borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color,
        boxShadow: visual.stage === "base" ? undefined : `0 0 28px ${visual.softColor}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${visual.color}, transparent)` }}
      />
      <div className="flex items-center gap-3">
        <ChargeProgressRing visual={visual} size={62} strokeWidth={5} />
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Charge Moment
          </span>
          <span className="block truncate font-display text-lg font-semibold text-foreground">
            {moment.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Zap className="h-3 w-3" />
              {moment.rewardLabel}
            </span>
            <span>{moment.nextLabel}</span>
          </span>
        </span>
      </div>
      <div className="mt-3 grid h-1.5 grid-cols-12 gap-1">
        {Array.from({ length: 12 }).map((_, index) => {
          const active = index < Math.max(1, Math.round((moment.progressPercent / 100) * 12));
          return (
            <span
              key={index}
              className="rounded-full"
              style={{
                backgroundColor: active ? visual.color : "hsl(var(--muted))",
                opacity: active ? 1 : 0.65,
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
