import type { ControllableType } from "@/components/ControllableCard";
import { AWARENESS_ROSTER_DESCRIPTION } from "@/lib/awarenessLanguage";

export type ControllableChargeStage = "base" | "charged" | "fully charged";
export type ChargeStageLevel = 1 | 2 | 3;

export const CONTROLLABLE_CHARGE_STAGES: ControllableChargeStage[] = [
  "base",
  "charged",
  "fully charged",
];

export interface ControllableRosterProfile {
  type: ControllableType;
  name: string;
  /**
   * Deprecated compatibility field. User-facing UI should use `name`.
   */
  role: ControllableType;
  /**
   * Deprecated compatibility field. Kept equal to the Controllable name.
   */
  roleLabel: string;
  shortDescription: string;
}

export interface ControllableChargeStageInput {
  type?: ControllableType;
  level: number;
  progress: number;
  totalXp: number;
}

export interface ControllableChargeStageState {
  chargeStage: ControllableChargeStage;
  chargeStageLevel: ChargeStageLevel;
  chargeStageLabel: string;
  chargeProgress: number;
  nextChargeStage: ControllableChargeStage | null;
  nextChargeStageLabel: string | null;
  progressLabel: string;
  nextMilestoneLabel: string;
  shareMilestoneCopy: string;
  /**
   * Deprecated compatibility aliases.
   */
  stage: ControllableChargeStage;
  stageLabel: string;
}

export type ControllableEvolutionInput = ControllableChargeStageInput;
export type ControllableEvolutionState = ControllableChargeStageState;

const CONTROLLABLE_NAMES: Record<ControllableType, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

const ROSTER_PROFILES: Record<ControllableType, Omit<ControllableRosterProfile, "type" | "role" | "roleLabel">> = {
  awareness: {
    shortDescription: AWARENESS_ROSTER_DESCRIPTION,
    name: "Awareness",
  },
  perspective: {
    shortDescription: "Turns noise into meaning and helps you zoom out.",
    name: "Perspective",
  },
  habit: {
    shortDescription: "Turns good intentions into repeatable moves.",
    name: "Habit",
  },
  wellness: {
    shortDescription: "Keeps your energy, body, and recovery online.",
    name: "Wellness",
  },
  environment: {
    shortDescription: "Guards your attention and lowers friction around you.",
    name: "Environment",
  },
};

export function getControllableRosterProfile(type: ControllableType): ControllableRosterProfile {
  return {
    type,
    role: type,
    roleLabel: CONTROLLABLE_NAMES[type],
    ...ROSTER_PROFILES[type],
  };
}

export function getControllableChargeStage(progress: number, totalXp: number): ControllableChargeStage {
  if (totalXp <= 0 || progress < 0.34) return "base";
  if (progress < 0.84) return "charged";
  return "fully charged";
}

export function getChargeStageLevel(stage: ControllableChargeStage): ChargeStageLevel {
  if (stage === "fully charged") return 3;
  if (stage === "charged") return 2;
  return 1;
}

export function getChargeStageLabel(
  type: ControllableType,
  stage: ControllableChargeStage,
): string {
  const name = CONTROLLABLE_NAMES[type];
  if (stage === "fully charged") return `${name} Fully Charged`;
  if (stage === "charged") return `${name} Charged`;
  return name;
}

export function getNextChargeStage(stage: ControllableChargeStage): ControllableChargeStage | null {
  if (stage === "base") return "charged";
  if (stage === "charged") return "fully charged";
  return null;
}

function getProgressTargetLabel(nextChargeStage: ControllableChargeStage | null): string {
  if (nextChargeStage === "fully charged") return "Fully Charged";
  if (nextChargeStage === "charged") return "Charged";
  return "Stay Charged";
}

export function getChargeStageMilestoneCopy(
  type: ControllableType,
  stage: ControllableChargeStage,
): string {
  const label = getChargeStageLabel(type, stage);
  if (stage === "fully charged") return `${label}. Living Fully Charged, one rep at a time.`;
  if (stage === "charged") return `${label}. The Continuous Upgrade is working.`;
  return `${label}. Control the Controllables one day at a time.`;
}

export function getControllableChargeStageState({
  type = "habit",
  progress,
  totalXp,
}: ControllableChargeStageInput): ControllableChargeStageState {
  const chargeStage = getControllableChargeStage(progress, totalXp);
  const nextChargeStage = getNextChargeStage(chargeStage);
  const chargeStageLabel = getChargeStageLabel(type, chargeStage);
  const nextChargeStageLabel = nextChargeStage ? getChargeStageLabel(type, nextChargeStage) : null;
  const progressPercent = Math.round(progress * 100);

  if (totalXp <= 0) {
    return {
      chargeStage,
      chargeStageLevel: getChargeStageLevel(chargeStage),
      chargeStageLabel,
      chargeProgress: progressPercent,
      nextChargeStage,
      nextChargeStageLabel,
      progressLabel: `${CONTROLLABLE_NAMES[type]} is ready for its first reps.`,
      nextMilestoneLabel: nextChargeStageLabel ?? "Stay Fully Charged",
      shareMilestoneCopy: getChargeStageMilestoneCopy(type, chargeStage),
      stage: chargeStage,
      stageLabel: chargeStageLabel,
    };
  }

  const progressLabel =
    chargeStage === "fully charged"
      ? `${chargeStageLabel}. Stay Charged.`
      : `${CONTROLLABLE_NAMES[type]} is ${progressPercent}% to ${getProgressTargetLabel(nextChargeStage)}.`;

  return {
    chargeStage,
    chargeStageLevel: getChargeStageLevel(chargeStage),
    chargeStageLabel,
    chargeProgress: progressPercent,
    nextChargeStage,
    nextChargeStageLabel,
    progressLabel,
    nextMilestoneLabel: nextChargeStageLabel ?? `${CONTROLLABLE_NAMES[type]} Fully Charged`,
    shareMilestoneCopy: getChargeStageMilestoneCopy(type, chargeStage),
    stage: chargeStage,
    stageLabel: chargeStageLabel,
  };
}

export const getControllableEvolutionState = getControllableChargeStageState;
