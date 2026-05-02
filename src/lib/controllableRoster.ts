import type { ControllableType } from "@/components/ControllableCard";
import { AWARENESS_ROSTER_DESCRIPTION } from "@/lib/awarenessLanguage";

export type ControllableRole = "scout" | "translator" | "builder" | "charger" | "protector";
export type ControllableChargeStage = "base" | "charged" | "fully charged";

export interface ControllableRosterProfile {
  type: ControllableType;
  role: ControllableRole;
  roleLabel: string;
  shortDescription: string;
}

export interface ControllableEvolutionInput {
  level: number;
  progress: number;
  totalXp: number;
}

export interface ControllableEvolutionState {
  stage: ControllableChargeStage;
  stageLabel: string;
  progressLabel: string;
  nextMilestoneLabel: string;
}

const ROSTER_PROFILES: Record<ControllableType, Omit<ControllableRosterProfile, "type">> = {
  awareness: {
    role: "scout",
    roleLabel: "Scout",
    shortDescription: AWARENESS_ROSTER_DESCRIPTION,
  },
  perspective: {
    role: "translator",
    roleLabel: "Translator",
    shortDescription: "Turns noise into meaning and helps you zoom out.",
  },
  habit: {
    role: "builder",
    roleLabel: "Builder",
    shortDescription: "Turns good intentions into repeatable moves.",
  },
  wellness: {
    role: "charger",
    roleLabel: "Charger",
    shortDescription: "Keeps your energy, body, and recovery online.",
  },
  environment: {
    role: "protector",
    roleLabel: "Protector",
    shortDescription: "Guards your attention and lowers friction around you.",
  },
};

export function getControllableRosterProfile(type: ControllableType): ControllableRosterProfile {
  return { type, ...ROSTER_PROFILES[type] };
}

export function getControllableChargeStage(progress: number, totalXp: number): ControllableChargeStage {
  if (totalXp <= 0 || progress < 0.34) return "base";
  if (progress < 0.84) return "charged";
  return "fully charged";
}

export function getControllableEvolutionState({
  level,
  progress,
  totalXp,
}: ControllableEvolutionInput): ControllableEvolutionState {
  const stage = getControllableChargeStage(progress, totalXp);
  const progressPercent = Math.round(progress * 100);

  if (totalXp <= 0) {
    return {
      stage,
      stageLabel: "base",
      progressLabel: "Ready to start charging with your first few moves.",
      nextMilestoneLabel: "First evolution ahead",
    };
  }

  return {
    stage,
    stageLabel: stage,
    progressLabel:
      stage === "fully charged"
        ? "Nearly ready for the next evolution."
        : `${progressPercent}% toward the next evolution.`,
    nextMilestoneLabel: `Evolution ${level + 1} ahead`,
  };
}
