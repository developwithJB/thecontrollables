export interface ChargeLogLike {
  amount: number;
  created_at: string;
}

export interface ChargeProgressSnapshot {
  chargeCircuit: number;
  chargeStageLevel: 1 | 2 | 3;
  chargeXp: number;
  chargeProgress: number;
  chargeStageLabel: "Base" | "Charged" | "Fully Charged";
  evolutionStage: number;
  evolutionXp: number;
  xpPerStage: number;
  xpInCurrentStage: number;
  progressPercent: number;
  chargedThresholdXp: number;
  fullyChargedThresholdXp: number;
  chargeState: "base" | "charged" | "fully charged";
  nextMilestoneLabel: string;
  xpToNextMilestone: number;
  xpToNextStage: number;
}

export type EvolutionLogLike = ChargeLogLike;
export type EvolutionProgressSnapshot = ChargeProgressSnapshot;

export interface ChargeRhythmSnapshot {
  activeDays: number;
  totalDays: number;
  todayXp: number;
  weekXp: number;
  isRepairDay: boolean;
  quietDaysBeforeToday: number;
  rhythmLabel: string;
  rhythmSupport: string;
  repairLabel: string | null;
}

export const CHARGE_XP_PER_CIRCUIT = 500;
export const EVOLUTION_XP_PER_STAGE = CHARGE_XP_PER_CIRCUIT;
export const CHARGED_THRESHOLD = 0.34;
export const FULLY_CHARGED_THRESHOLD = 0.84;

function toLocalDateKey(value: string | Date): string {
  return new Date(value).toLocaleDateString("sv-SE");
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function subtractDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function getChargeStageLevel(chargeState: ChargeProgressSnapshot["chargeState"]): 1 | 2 | 3 {
  if (chargeState === "fully charged") return 3;
  if (chargeState === "charged") return 2;
  return 1;
}

function getChargeStageLabel(chargeState: ChargeProgressSnapshot["chargeState"]): ChargeProgressSnapshot["chargeStageLabel"] {
  if (chargeState === "fully charged") return "Fully Charged";
  if (chargeState === "charged") return "Charged";
  return "Base";
}

function buildChargeSnapshot({
  chargeState,
  chargeXp,
  chargeCircuit,
  xpInCurrentStage,
  progressPercent,
  chargedThresholdXp,
  fullyChargedThresholdXp,
  nextMilestoneLabel,
  xpToNextMilestone,
}: {
  chargeState: ChargeProgressSnapshot["chargeState"];
  chargeXp: number;
  chargeCircuit: number;
  xpInCurrentStage: number;
  progressPercent: number;
  chargedThresholdXp: number;
  fullyChargedThresholdXp: number;
  nextMilestoneLabel: string;
  xpToNextMilestone: number;
}): ChargeProgressSnapshot {
  return {
    chargeCircuit,
    chargeStageLevel: getChargeStageLevel(chargeState),
    chargeXp,
    chargeProgress: Math.round(progressPercent),
    chargeStageLabel: getChargeStageLabel(chargeState),
    evolutionStage: chargeCircuit,
    evolutionXp: chargeXp,
    xpPerStage: CHARGE_XP_PER_CIRCUIT,
    xpInCurrentStage,
    progressPercent,
    chargedThresholdXp,
    fullyChargedThresholdXp,
    chargeState,
    nextMilestoneLabel,
    xpToNextMilestone,
    xpToNextStage: CHARGE_XP_PER_CIRCUIT - xpInCurrentStage,
  };
}

export function getChargeProgress(totalXp: number): ChargeProgressSnapshot {
  const chargeXp = Math.max(totalXp, 0);
  const chargeCircuit = Math.floor(chargeXp / CHARGE_XP_PER_CIRCUIT) + 1;
  const xpInCurrentStage = chargeXp % CHARGE_XP_PER_CIRCUIT;
  const progressPercent = (xpInCurrentStage / CHARGE_XP_PER_CIRCUIT) * 100;
  const chargedThresholdXp = Math.ceil(CHARGE_XP_PER_CIRCUIT * CHARGED_THRESHOLD);
  const fullyChargedThresholdXp = Math.ceil(CHARGE_XP_PER_CIRCUIT * FULLY_CHARGED_THRESHOLD);

  if (xpInCurrentStage < chargedThresholdXp) {
    return buildChargeSnapshot({
      chargeCircuit,
      chargeXp,
      xpInCurrentStage,
      progressPercent,
      chargedThresholdXp,
      fullyChargedThresholdXp,
      chargeState: "base",
      nextMilestoneLabel: "Charged",
      xpToNextMilestone: chargedThresholdXp - xpInCurrentStage,
    });
  }

  if (xpInCurrentStage < fullyChargedThresholdXp) {
    return buildChargeSnapshot({
      chargeCircuit,
      chargeXp,
      xpInCurrentStage,
      progressPercent,
      chargedThresholdXp,
      fullyChargedThresholdXp,
      chargeState: "charged",
      nextMilestoneLabel: "Fully Charged",
      xpToNextMilestone: fullyChargedThresholdXp - xpInCurrentStage,
    });
  }

  return buildChargeSnapshot({
    chargeCircuit,
    chargeXp,
    xpInCurrentStage,
    progressPercent,
    chargedThresholdXp,
    fullyChargedThresholdXp,
    chargeState: "fully charged",
    nextMilestoneLabel: "Next Circuit",
    xpToNextMilestone: CHARGE_XP_PER_CIRCUIT - xpInCurrentStage,
  });
}

export const getEvolutionProgress = getChargeProgress;

export function getChargeRhythm(logs: ChargeLogLike[], referenceDate = new Date()): ChargeRhythmSnapshot {
  const todayKey = toLocalDateKey(referenceDate);
  const activityByDay = new Map<string, number>();

  logs.forEach((log) => {
    const dateKey = toLocalDateKey(log.created_at);
    activityByDay.set(dateKey, (activityByDay.get(dateKey) ?? 0) + log.amount);
  });

  const todayXp = activityByDay.get(todayKey) ?? 0;
  let activeDays = 0;
  let weekXp = 0;

  for (let index = 0; index < 7; index += 1) {
    const dayKey = toLocalDateKey(subtractDays(referenceDate, index));
    const xp = activityByDay.get(dayKey) ?? 0;
    if (xp > 0) activeDays += 1;
    weekXp += xp;
  }

  const activeDateKeys = Array.from(activityByDay.keys())
    .filter((dateKey) => dateKey < todayKey && (activityByDay.get(dateKey) ?? 0) > 0)
    .sort((a, b) => parseDateKey(b).getTime() - parseDateKey(a).getTime());

  const mostRecentActiveBeforeToday = activeDateKeys[0] ?? null;
  const quietDaysBeforeToday = mostRecentActiveBeforeToday
    ? Math.max(
        Math.round(
          (parseDateKey(todayKey).getTime() - parseDateKey(mostRecentActiveBeforeToday).getTime()) /
            (1000 * 60 * 60 * 24),
        ) - 1,
        0,
      )
    : 0;

  const isRepairDay = todayXp > 0 && quietDaysBeforeToday >= 1;

  let rhythmSupport = "Repair stays available. Progress does not disappear when a day gets messy.";
  if (activeDays >= 5) {
    rhythmSupport = "Strong rhythm. The system is compounding because you've stayed in motion.";
  } else if (activeDays >= 3) {
    rhythmSupport = "Steady rhythm. You're building enough repetition for the pattern to hold.";
  } else if (todayXp > 0) {
    rhythmSupport = "Back in motion. One real return does more than waiting for a perfect streak.";
  }

  return {
    activeDays,
    totalDays: 7,
    todayXp,
    weekXp,
    isRepairDay,
    quietDaysBeforeToday,
    rhythmLabel: `${activeDays}/7 active days`,
    rhythmSupport,
    repairLabel: isRepairDay
      ? `Repair XP counts. You came back after ${quietDaysBeforeToday} quiet day${quietDaysBeforeToday === 1 ? "" : "s"}.`
      : null,
  };
}
