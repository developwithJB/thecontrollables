import type { ControllableType } from "@/components/ControllableCard";
import type { MissionOfTheDay } from "@/lib/missionOfTheDay";
import { getLevelProgress } from "@/lib/controllableTheme";
import { getControllableChargeStageState } from "@/lib/controllableRoster";

export const MISSION_COMPLETION_SOURCE = "mission_of_the_day";
export const MISSION_SELF_TRUST_SOURCE = "mission_self_trust";

export interface MissionCompletionProgress {
  type: ControllableType;
  totalXp: number;
  level: number;
  progress: number;
  chargeStageLabel: string;
  nextChargeStageLabel: string | null;
  progressLabel: string;
}

export function buildMissionCompletionActionText(mission: MissionOfTheDay): string {
  return `Mission of the Day: ${mission.date}: ${mission.missionTitle}`;
}

export function buildMissionCompletionXpDescription(mission: MissionOfTheDay): string {
  return `${buildMissionCompletionActionText(mission)} Controllable XP`;
}

export function buildMissionSelfTrustDescription(mission: MissionOfTheDay): string {
  return `${buildMissionCompletionActionText(mission)} Self-Trust`;
}

export function isMissionCompletionAction(actionText: string, mission: MissionOfTheDay): boolean {
  return actionText === buildMissionCompletionActionText(mission);
}

export function applyMissionCompletionProgress(
  mission: MissionOfTheDay,
  currentTotalXp: number,
  alreadyCompleted = false,
): MissionCompletionProgress {
  const totalXp = Math.max(0, Math.round(currentTotalXp + (alreadyCompleted ? 0 : mission.xpReward)));
  const levelProgress = getLevelProgress(totalXp);
  const chargeState = getControllableChargeStageState({
    type: mission.targetControllable,
    totalXp,
    level: levelProgress.level,
    progress: levelProgress.progress,
  });

  return {
    type: mission.targetControllable,
    totalXp,
    level: levelProgress.level,
    progress: levelProgress.progress,
    chargeStageLabel: chargeState.chargeStageLabel,
    nextChargeStageLabel: chargeState.nextChargeStageLabel,
    progressLabel: chargeState.progressLabel,
  };
}
