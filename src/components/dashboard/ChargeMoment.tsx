import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { ControllableType } from "@/components/ControllableCard";
import { getChargeMomentDisplay } from "@/lib/controllableVisuals";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{
          backgroundColor: `hsl(var(--${type}) / 0.14)`,
          boxShadow: `0 0 24px hsl(var(--${type}) / 0.22)`,
        }}
        aria-hidden="true"
      >
        {moment.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-semibold text-foreground">
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
    </motion.div>
  );
}
