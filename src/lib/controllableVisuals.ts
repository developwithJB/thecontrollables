import type { ControllableType } from "@/components/ControllableCard";
import {
  getChargeStageLabel,
  getControllableChargeStageState,
  type ControllableChargeStage,
  type ControllableChargeStageInput,
} from "@/lib/controllableRoster";

export const CONTROLLABLE_VISUAL_ICONS: Record<ControllableType, string> = {
  awareness: "🦉",
  perspective: "🐢",
  habit: "🦈",
  wellness: "🛰️",
  environment: "🚀",
};

const CONTROLLABLE_VISUAL_NAMES: Record<ControllableType, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

export interface ChargeStageDisplay {
  label: string;
  stateLabel: "Base" | "Charged" | "Fully Charged";
  aura: "low" | "medium" | "high";
  ringPercent: number;
  badgeLabel: string | null;
}

export interface ControllableChargeVisual {
  type: ControllableType;
  icon: string;
  name: string;
  color: string;
  softColor: string;
  stage: ControllableChargeStage;
  stageLevel: number;
  displayLabel: string;
  stateLabel: ChargeStageDisplay["stateLabel"];
  badgeLabel: string | null;
  progressPercent: number;
  ringPercent: number;
  totalXp: number;
  level: number;
  nextStageLabel: string;
}

export interface ChargeMomentDisplay {
  icon: string;
  title: string;
  rewardLabel: string;
  nextLabel: string;
  progressPercent: number;
}

export function getControllableVisualIcon(type: ControllableType): string {
  return CONTROLLABLE_VISUAL_ICONS[type];
}

export function getControllableVisualColor(type: ControllableType): string {
  return `hsl(var(--${type}))`;
}

export function getControllableVisualSoftColor(type: ControllableType): string {
  return `hsl(var(--${type}) / 0.14)`;
}

export function getChargeProgressPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(Math.max(Math.round(progress * 100), 0), 100);
}

export function getChargeStageDisplay(
  type: ControllableType,
  stage: ControllableChargeStage,
  progressPercent: number,
): ChargeStageDisplay {
  if (stage === "fully charged") {
    return {
      label: getChargeStageLabel(type, stage),
      stateLabel: "Fully Charged",
      aura: "high",
      ringPercent: 100,
      badgeLabel: "Fully Charged",
    };
  }

  if (stage === "charged") {
    return {
      label: getChargeStageLabel(type, stage),
      stateLabel: "Charged",
      aura: "medium",
      ringPercent: Math.max(progressPercent, 44),
      badgeLabel: "Charged",
    };
  }

  return {
    label: getChargeStageLabel(type, stage),
    stateLabel: "Base",
    aura: "low",
    ringPercent: Math.max(progressPercent, 8),
    badgeLabel: null,
  };
}

export function getControllableChargeVisual(input: ControllableChargeStageInput): ControllableChargeVisual {
  const type = input.type ?? "habit";
  const chargeState = getControllableChargeStageState(input);
  const progressPercent = getChargeProgressPercent(input.progress);
  const stageDisplay = getChargeStageDisplay(type, chargeState.chargeStage, progressPercent);

  return {
    type,
    icon: getControllableVisualIcon(type),
    name: CONTROLLABLE_VISUAL_NAMES[type],
    color: getControllableVisualColor(type),
    softColor: getControllableVisualSoftColor(type),
    stage: chargeState.chargeStage,
    stageLevel: chargeState.chargeStageLevel,
    displayLabel: stageDisplay.label,
    stateLabel: stageDisplay.stateLabel,
    badgeLabel: stageDisplay.badgeLabel,
    progressPercent,
    ringPercent: stageDisplay.ringPercent,
    totalXp: input.totalXp,
    level: input.level,
    nextStageLabel: chargeState.nextChargeStageLabel ?? `${CONTROLLABLE_VISUAL_NAMES[type]} Fully Charged`,
  };
}

export function getChargeMomentDisplay({
  type,
  xpAwarded,
  progress,
  totalXp,
  level = 1,
}: {
  type: ControllableType;
  xpAwarded: number;
  progress: number;
  totalXp: number;
  level?: number;
}): ChargeMomentDisplay {
  const visual = getControllableChargeVisual({ type, level, progress, totalXp });

  return {
    icon: visual.icon,
    title: visual.displayLabel,
    rewardLabel: `+${xpAwarded} ${visual.name} XP`,
    nextLabel: visual.stage === "fully charged" ? "Stay Fully Charged" : `Next: ${visual.nextStageLabel}`,
    progressPercent: visual.progressPercent,
  };
}
