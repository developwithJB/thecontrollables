import { motion } from "framer-motion";
import { Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControllableLevel } from "@/hooks/useControllableLevels";
import {
  getControllableChargeVisual,
  type ControllableChargeVisual as ControllableChargeVisualState,
} from "@/lib/controllableVisuals";
import { cn } from "@/lib/utils";

interface ChargeProgressRingProps {
  visual: ControllableChargeVisualState;
  size?: number;
  strokeWidth?: number;
  showPercent?: boolean;
  className?: string;
}

interface ControllableChargeTileProps {
  level: ControllableLevel;
}

interface ControllableChargeCardProps {
  level: ControllableLevel;
  onStartMission?: (type: ControllableLevel["type"]) => void;
}

const AURA_CLASS: Record<ControllableChargeVisualState["stateLabel"], string> = {
  Base: "shadow-[0_0_18px_hsl(var(--foreground)/0.05)]",
  Charged: "shadow-[0_0_24px_hsl(var(--accent)/0.18)]",
  "Fully Charged": "shadow-[0_0_34px_hsl(var(--accent)/0.28)]",
};

export function ChargeProgressRing({
  visual,
  size = 58,
  strokeWidth = 4,
  showPercent = false,
  className,
}: ChargeProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - visual.ringPercent / 100);

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={visual.softColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={visual.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          style={{ filter: visual.stage === "base" ? undefined : `drop-shadow(0 0 6px ${visual.color})` }}
        />
      </svg>
      <span
        className="absolute inset-1 flex items-center justify-center rounded-full text-xl"
        style={{ backgroundColor: visual.softColor }}
        aria-hidden="true"
      >
        {showPercent ? (
          <span className="text-[10px] font-bold text-foreground">{visual.progressPercent}%</span>
        ) : (
          visual.icon
        )}
      </span>
    </div>
  );
}

export function ControllableChargeTile({ level }: ControllableChargeTileProps) {
  const visual = getControllableChargeVisual(level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-background/45 px-2 py-3 text-center",
        AURA_CLASS[visual.stateLabel],
      )}
      style={{ borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color }}
      title={`${visual.displayLabel}: ${visual.progressPercent}% charge`}
    >
      <div
        className="pointer-events-none absolute inset-x-2 top-0 h-px opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${visual.color}, transparent)` }}
      />
      <ChargeProgressRing visual={visual} size={48} strokeWidth={4} />
      <span className="mt-2 block truncate text-[10px] font-semibold text-foreground">
        {visual.displayLabel}
      </span>
      <span className="mt-1 block text-[9px] font-medium text-muted-foreground">
        Lv {visual.level} · {visual.progressPercent}%
      </span>
    </motion.div>
  );
}

export function ControllableChargeCard({ level, onStartMission }: ControllableChargeCardProps) {
  const visual = getControllableChargeVisual(level);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-background/55 p-4",
        AURA_CLASS[visual.stateLabel],
      )}
      style={{ borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: visual.color }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <ChargeProgressRing visual={visual} size={74} strokeWidth={5} />
        <div className="flex min-w-0 flex-1 flex-col items-end gap-2 text-right">
          {visual.badgeLabel ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: visual.color, color: visual.color, backgroundColor: visual.softColor }}
            >
              {visual.badgeLabel}
            </span>
          ) : (
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Base
            </span>
          )}
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Level {visual.level}
          </span>
        </div>
      </div>

      <div className="relative mt-4 space-y-3">
        <div className="space-y-1">
          <h3 className="truncate font-display text-lg font-semibold text-foreground">
            {visual.displayLabel}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {visual.totalXp} XP
            </span>
            <span className="truncate text-right">{visual.progressPercent}%</span>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted/70">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${visual.progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: visual.color }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] font-medium text-muted-foreground">
            Next: {visual.nextStageLabel}
          </span>
          <Button
            size="sm"
            className="h-8 shrink-0 gap-1 px-2.5 text-xs"
            onClick={() => onStartMission?.(visual.type)}
          >
            <Target className="h-3.5 w-3.5" />
            Charge
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
