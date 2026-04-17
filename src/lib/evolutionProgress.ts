export interface EvolutionLogLike {
  amount: number;
  created_at: string;
}

export interface EvolutionProgressSnapshot {
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

export const EVOLUTION_XP_PER_STAGE = 500;
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

export function getEvolutionProgress(totalXp: number): EvolutionProgressSnapshot {
  const evolutionXp = Math.max(totalXp, 0);
  const evolutionStage = Math.floor(evolutionXp / EVOLUTION_XP_PER_STAGE) + 1;
  const xpInCurrentStage = evolutionXp % EVOLUTION_XP_PER_STAGE;
  const progressPercent = (xpInCurrentStage / EVOLUTION_XP_PER_STAGE) * 100;
  const chargedThresholdXp = Math.ceil(EVOLUTION_XP_PER_STAGE * CHARGED_THRESHOLD);
  const fullyChargedThresholdXp = Math.ceil(EVOLUTION_XP_PER_STAGE * FULLY_CHARGED_THRESHOLD);

  if (xpInCurrentStage < chargedThresholdXp) {
    return {
      evolutionStage,
      evolutionXp,
      xpPerStage: EVOLUTION_XP_PER_STAGE,
      xpInCurrentStage,
      progressPercent,
      chargedThresholdXp,
      fullyChargedThresholdXp,
      chargeState: "base",
      nextMilestoneLabel: "Charged",
      xpToNextMilestone: chargedThresholdXp - xpInCurrentStage,
      xpToNextStage: EVOLUTION_XP_PER_STAGE - xpInCurrentStage,
    };
  }

  if (xpInCurrentStage < fullyChargedThresholdXp) {
    return {
      evolutionStage,
      evolutionXp,
      xpPerStage: EVOLUTION_XP_PER_STAGE,
      xpInCurrentStage,
      progressPercent,
      chargedThresholdXp,
      fullyChargedThresholdXp,
      chargeState: "charged",
      nextMilestoneLabel: "Fully Charged",
      xpToNextMilestone: fullyChargedThresholdXp - xpInCurrentStage,
      xpToNextStage: EVOLUTION_XP_PER_STAGE - xpInCurrentStage,
    };
  }

  return {
    evolutionStage,
    evolutionXp,
    xpPerStage: EVOLUTION_XP_PER_STAGE,
    xpInCurrentStage,
    progressPercent,
    chargedThresholdXp,
    fullyChargedThresholdXp,
    chargeState: "fully charged",
    nextMilestoneLabel: `Evolution ${evolutionStage + 1}`,
    xpToNextMilestone: EVOLUTION_XP_PER_STAGE - xpInCurrentStage,
    xpToNextStage: EVOLUTION_XP_PER_STAGE - xpInCurrentStage,
  };
}

export function getChargeRhythm(logs: EvolutionLogLike[], referenceDate = new Date()): ChargeRhythmSnapshot {
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
