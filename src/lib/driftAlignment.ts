import type {
  GameSignals,
  SignalCalendarInput,
  SignalCheckInInput,
  SignalWearableInput,
  SupportMode,
} from "@/lib/signalInterpreter";

export type DriftLevel = "low" | "moderate" | "high";
export type DriftDriverId =
  | "inactivity_gap"
  | "awareness_gap"
  | "checkin_gap"
  | "promise_slip"
  | "recovery_load"
  | "calendar_pressure"
  | "environment_friction";

export interface DriftDriver {
  id: DriftDriverId;
  label: string;
  detail: string;
  impact: number;
}

export interface DriftAlignmentInput {
  daysSinceLastVisit: number | null;
  daysSinceLastAction: number | null;
  awarenessCheckInsLast7: number;
  honestCheckInsLast7: number;
  dailyCheckInsLast7: number;
  completedMovesLast7: number;
  completedMovesToday: number;
  awarenessToday: boolean;
  keptPromiseRate14: number | null;
  resolvedPromises14: number;
  activeQuest: boolean;
  environmentResets7: number;
  calendar: SignalCalendarInput | null;
  wearable: SignalWearableInput | null;
  checkIn: SignalCheckInInput | null;
  signals: GameSignals | null;
}

export interface DriftAlignmentResult {
  alignmentScore: number;
  driftScore: number;
  driftLevel: DriftLevel;
  primaryDriftDrivers: DriftDriver[];
  groundingMoveNow: string;
  recoveryMoveToday: string;
  headline: string;
  supportLine: string;
  returnBonusApplied: boolean;
  shouldShowReturnFromDrift: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isHeavyCalendar(calendar: SignalCalendarInput | null): boolean {
  return calendar?.dayType === "heavy" || calendar?.dayType === "admin_heavy";
}

function isFragmentedCalendar(calendar: SignalCalendarInput | null): boolean {
  return calendar?.dayType === "fragmented";
}

function buildGroundingMove(awarenessToday: boolean): string {
  if (awarenessToday) {
    return "Stay with the Awareness Move you already started. Tell God one more honest sentence about what feels true, what you need to surrender, and one thing you can still receive with gratitude.";
  }

  return "Take one quiet minute to check in with God. Name what feels true, surrender what you cannot control, and write one line of gratitude before the day speeds up again.";
}

function buildRecoveryMove(
  input: DriftAlignmentInput,
  drivers: DriftDriver[],
): string {
  const topDriver = drivers[0]?.id;
  const lowRecovery = input.wearable?.recovery != null && input.wearable.recovery < 34;
  const shortSleep = input.wearable?.sleepMinutes != null && input.wearable.sleepMinutes < 360;

  if (lowRecovery || shortSleep || topDriver === "recovery_load") {
    return "Let today be gentler than your ambition wants. Protect food, water, one quieter block, and tonight’s recovery window before you ask for more output.";
  }

  if (topDriver === "calendar_pressure" || isHeavyCalendar(input.calendar) || isFragmentedCalendar(input.calendar)) {
    return "Shrink one non-essential demand and defend one small pocket of space for a calmer reset. Protection counts as progress today.";
  }

  if (topDriver === "promise_slip" || (input.activeQuest && input.completedMovesLast7 <= 2)) {
    return "Choose one promise small enough to keep today. Let completion rebuild trust instead of trying to win the whole week back at once.";
  }

  if (topDriver === "environment_friction" || input.environmentResets7 === 0) {
    return "Reset one surface or silence one digital trigger before your next block. Make the next right choice easier than the noisy one.";
  }

  if (input.signals?.suggestedSupportMove) {
    return input.signals.suggestedSupportMove;
  }

  return "Keep today simple: one grounding move, one honest promise, and one small recovery choice is enough to start re-alignment.";
}

export function interpretDriftAlignment(
  input: DriftAlignmentInput,
): DriftAlignmentResult {
  const drivers: DriftDriver[] = [];
  let driftScore = 0;
  let driftRelief = 0;
  let alignmentBoost = 0;

  const daysSinceLastAction = input.daysSinceLastAction ?? 0;
  const daysSinceLastVisit = input.daysSinceLastVisit ?? 0;
  const lowRecovery = input.wearable?.recovery != null && input.wearable.recovery < 34;
  const shortSleep = input.wearable?.sleepMinutes != null && input.wearable.sleepMinutes < 360;
  const highStress = input.checkIn?.stress != null && input.checkIn.stress >= 4;
  const lowEnergy = input.checkIn?.energy != null && input.checkIn.energy <= 2;
  const protectedFocus = (input.calendar?.longestFocusBlock ?? 0) >= 90;
  const heavyCalendar = isHeavyCalendar(input.calendar);
  const fragmentedCalendar = isFragmentedCalendar(input.calendar);

  if (daysSinceLastAction >= 3) {
    const impact = clamp(18 + (daysSinceLastAction - 3) * 4, 18, 34);
    drivers.push({
      id: "inactivity_gap",
      label: "Your daily rhythm went quiet",
      detail: `It has been ${daysSinceLastAction} day${daysSinceLastAction === 1 ? "" : "s"} since your last clear rep.`,
      impact,
    });
    driftScore += impact;
  } else if (daysSinceLastVisit >= 3) {
    const impact = clamp(10 + (daysSinceLastVisit - 3) * 2, 10, 18);
    drivers.push({
      id: "inactivity_gap",
      label: "You have been away from the dashboard for a bit",
      detail: `The app has been quiet for ${daysSinceLastVisit} day${daysSinceLastVisit === 1 ? "" : "s"}, which often hides a larger disconnect.`,
      impact,
    });
    driftScore += impact;
  }

  if (input.awarenessCheckInsLast7 === 0) {
    drivers.push({
      id: "awareness_gap",
      label: "Honest check-ins with God have been sparse",
      detail: "The scout has not had much room to surface truth before the day takes over.",
      impact: 18,
    });
    driftScore += 18;
  } else if (input.awarenessCheckInsLast7 <= 1) {
    drivers.push({
      id: "awareness_gap",
      label: "Your awareness rhythm has been thin",
      detail: "A little more space for prayer, surrender, and gratitude would likely help.",
      impact: 10,
    });
    driftScore += 10;
  } else {
    alignmentBoost += 4;
  }

  if (input.honestCheckInsLast7 === 0 && input.awarenessCheckInsLast7 > 0) {
    drivers.push({
      id: "awareness_gap",
      label: "The check-ins may not have reached full honesty",
      detail: "When the truth stays vague, drift can hide under motion.",
      impact: 6,
    });
    driftScore += 6;
  } else if (input.honestCheckInsLast7 >= 2) {
    alignmentBoost += 4;
  }

  if (input.dailyCheckInsLast7 === 0) {
    drivers.push({
      id: "checkin_gap",
      label: "Daily check-ins lost their place",
      detail: "The day has had less structure for noticing what matters most in this season.",
      impact: 12,
    });
    driftScore += 12;
  } else if (input.dailyCheckInsLast7 <= 2) {
    drivers.push({
      id: "checkin_gap",
      label: "Daily alignment has been lighter than usual",
      detail: "A softer but steadier daily rhythm would help re-alignment land.",
      impact: 7,
    });
    driftScore += 7;
  } else {
    alignmentBoost += 4;
  }

  if (input.keptPromiseRate14 != null && input.resolvedPromises14 >= 2) {
    if (input.keptPromiseRate14 < 40) {
      drivers.push({
        id: "promise_slip",
        label: "Promises or main-quest follow-through lost traction",
        detail: "What mattered may have gotten harder to carry into lived action.",
        impact: 14,
      });
      driftScore += 14;
    } else if (input.keptPromiseRate14 < 70) {
      drivers.push({
        id: "promise_slip",
        label: "Follow-through looks a bit unsteady",
        detail: "The gap between what mattered and what got lived may be widening.",
        impact: 8,
      });
      driftScore += 8;
    } else {
      alignmentBoost += 6;
    }
  } else if (input.activeQuest && input.completedMovesLast7 <= 2) {
    drivers.push({
      id: "promise_slip",
      label: "The quest seems to have lost momentum",
      detail: "A smaller promise may be needed before a bigger one can land again.",
      impact: 10,
    });
    driftScore += 10;
  }

  if (lowRecovery || shortSleep || highStress || lowEnergy) {
    const impact = (lowRecovery ? 8 : 0) + (shortSleep ? 6 : 0) + (highStress ? 4 : 0) + (lowEnergy ? 4 : 0);
    drivers.push({
      id: "recovery_load",
      label: "Recovery and inner load are asking for attention",
      detail: "Energy, sleep, or stress signals suggest the system has been carrying more than it can easily restore.",
      impact,
    });
    driftScore += impact;
  } else if ((input.wearable?.recovery ?? 0) >= 67 || (input.wearable?.sleepMinutes ?? 0) >= 420) {
    alignmentBoost += 5;
  }

  if (heavyCalendar || fragmentedCalendar || input.calendar?.overloadedPeriod) {
    const impact =
      (heavyCalendar ? 8 : 0) +
      (fragmentedCalendar ? 7 : 0) +
      (input.calendar?.overloadedPeriod ? 3 : 0) -
      (protectedFocus ? 3 : 0);

    drivers.push({
      id: "calendar_pressure",
      label: "The calendar has been loud without much protection",
      detail: protectedFocus
        ? "There is some protected space, but the surrounding load is still likely pulling you off center."
        : "Meeting density and switching are likely making re-alignment harder to hold.",
      impact: Math.max(impact, 4),
    });
    driftScore += Math.max(impact, 4);
  } else if (protectedFocus) {
    alignmentBoost += 4;
  }

  if (input.environmentResets7 === 0) {
    drivers.push({
      id: "environment_friction",
      label: "Your environment has not been reset much lately",
      detail: "When the space stays noisy, drift tends to stay easier than clarity.",
      impact: 7,
    });
    driftScore += 7;
  } else if (input.environmentResets7 >= 2) {
    alignmentBoost += 4;
  }

  const returnBonusApplied =
    daysSinceLastAction >= 2 && (input.awarenessToday || input.completedMovesToday > 0);

  if (returnBonusApplied) {
    driftRelief += input.awarenessToday && input.completedMovesToday > 0 ? 18 : 12;
    alignmentBoost += input.awarenessToday ? 10 : 7;
  }

  if (input.completedMovesToday >= 2) {
    driftRelief += 4;
    alignmentBoost += 4;
  }

  driftScore = clamp(driftScore - driftRelief, 0, 100);

  const alignmentScore = clamp(
    Math.round(72 - driftScore * 0.65 + alignmentBoost),
    0,
    100,
  );

  const driftLevel: DriftLevel =
    driftScore >= 60 ? "high" : driftScore >= 35 ? "moderate" : "low";

  const primaryDriftDrivers = [...drivers]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  const groundingMoveNow = buildGroundingMove(input.awarenessToday);
  const recoveryMoveToday = buildRecoveryMove(input, primaryDriftDrivers);

  const headline =
    driftLevel === "high"
      ? "You may have drifted a bit. Nothing here is a verdict."
      : driftLevel === "moderate"
        ? "You may have drifted a bit. That is honest data, not failure."
        : "You look mostly steady, but a gentle re-alignment could still help.";

  const supportLine = returnBonusApplied
    ? "You are already re-entering. You are not behind. Let’s get re-aligned from here."
    : "You are not behind. Let’s get re-aligned with one grounded move and one gentle recovery choice.";

  const shouldShowReturnFromDrift =
    driftLevel !== "low" &&
    (daysSinceLastAction >= 2 || daysSinceLastVisit >= 2 || driftScore >= 60) &&
    input.completedMovesToday <= 1;

  return {
    alignmentScore,
    driftScore,
    driftLevel,
    primaryDriftDrivers,
    groundingMoveNow,
    recoveryMoveToday,
    headline,
    supportLine,
    returnBonusApplied,
    shouldShowReturnFromDrift,
  };
}
