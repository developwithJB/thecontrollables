import { motion } from "framer-motion";
import { ArrowUpRight, Target, Zap } from "lucide-react";
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
  Base: "shadow-[0_0_18px_hsl(var(--foreground)/0.04)]",
  Charged: "shadow-[0_0_28px_hsl(var(--accent)/0.16)]",
  "Fully Charged": "shadow-[0_0_36px_hsl(var(--accent)/0.24)]",
};

const STAGE_MARKS = [1, 2, 3] as const;

function ChargeStagePips({ visual, compact = false }: { visual: ControllableChargeVisualState; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-1", compact ? "justify-center" : "justify-end")}>
      {STAGE_MARKS.map((stage) => {
        const active = stage <= visual.stageLevel;
        return (
          <span
            key={stage}
            className={cn(
              "h-1.5 rounded-full transition-all",
              compact ? "w-3" : "w-5",
              active ? "opacity-100" : "bg-muted opacity-60",
            )}
            style={active ? { backgroundColor: visual.color, boxShadow: `0 0 10px ${visual.color}` } : undefined}
          />
        );
      })}
    </div>
  );
}

function CircuitCells({ visual, cells = 8 }: { visual: ControllableChargeVisualState; cells?: number }) {
  const activeCells = Math.max(1, Math.round((visual.progressPercent / 100) * cells));

  return (
    <div className="grid h-2 grid-cols-8 gap-1">
      {Array.from({ length: cells }).map((_, index) => {
        const active = index < activeCells;
        return (
          <span
            key={index}
            className="rounded-full transition-colors"
            style={{
              backgroundColor: active ? visual.color : "hsl(var(--muted))",
              opacity: active ? 1 : 0.7,
            }}
          />
        );
      })}
    </div>
  );
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
  const tickRadius = radius + strokeWidth * 0.9;
  const ticks = STAGE_MARKS.map((stage) => {
    const angle = ((stage / 3) * 360 - 90) * (Math.PI / 180);
    return {
      stage,
      x: center + tickRadius * Math.cos(angle),
      y: center + tickRadius * Math.sin(angle),
    };
  });

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
        {ticks.map((tick) => (
          <circle
            key={tick.stage}
            cx={tick.x}
            cy={tick.y}
            r={strokeWidth * 0.72}
            fill={tick.stage <= visual.stageLevel ? visual.color : "hsl(var(--muted))"}
            opacity={tick.stage <= visual.stageLevel ? 1 : 0.85}
          />
        ))}
      </svg>
      <span
        className="absolute inset-1 flex items-center justify-center rounded-full border text-xl shadow-[inset_0_0_22px_hsl(var(--primary)/0.06)]"
        style={{
          backgroundColor: visual.softColor,
          borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color,
          boxShadow: visual.stage === "base" ? undefined : `inset 0 0 18px ${visual.softColor}`,
        }}
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
        "dashboard-os-card relative overflow-hidden rounded-xl px-2 py-3 text-center",
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
      <ChargeStagePips visual={visual} compact />
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
        "dashboard-os-card relative overflow-hidden rounded-2xl p-4",
        AURA_CLASS[visual.stateLabel],
      )}
      style={{ borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-5 gap-px opacity-60">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="h-px"
            style={{ backgroundColor: index <= visual.stageLevel ? visual.color : "hsl(var(--border))" }}
          />
        ))}
      </div>
      <div className="relative flex items-start justify-between gap-3">
        <div className="relative">
          <ChargeProgressRing visual={visual} size={84} strokeWidth={5} />
          <span
            className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full opacity-70"
            style={{ backgroundColor: visual.color }}
            aria-hidden="true"
          />
        </div>
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
          <ChargeStagePips visual={visual} />
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

        <CircuitCells visual={visual} />

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
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
