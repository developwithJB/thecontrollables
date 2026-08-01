import type { ControllableType } from "@/components/ControllableCard";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";

export type ChargeState = "undercharged" | "stable" | "strong";
export type SupportMode = "normal" | "protect" | "recover" | "stretch";
export type ChargeCheckReason = "calendar_recovery" | "stress_run" | "sleep_strain";

export interface SignalCalendarInput {
  connected: boolean;
  plannerCount: number;
  meetingCount: number;
  meetingMinutes: number;
  longestFocusBlock: number;
  contextSwitches: number;
  dayType: CalendarIntelligence["dayType"] | null;
  overloadedPeriod: CalendarIntelligence["overloadedPeriod"] | null;
}

export interface SignalWearableInput {
  connected: boolean;
  recovery: number | null;
  sleepMinutes: number | null;
  strain: number | null;
  recentLowSleepHighStrainCount?: number;
}

export interface SignalCheckInInput {
  mood: string | null;
  energy: number | null;
  stress: number | null;
  recentLowEnergyHighStressCount?: number;
}

export interface SignalInterpreterInput {
  calendar: SignalCalendarInput | null;
  wearable: SignalWearableInput | null;
  checkIn: SignalCheckInInput | null;
}

export interface ChargeCheckState {
  active: true;
  reason: ChargeCheckReason;
  headline: string;
  summary: string;
  mainQuest: string;
  supportMove: string;
}

export interface GameSignals {
  chargeState: ChargeState;
  likelyControllableAtRisk: ControllableType;
  likelyControllableOpportunity: ControllableType;
  supportMode: SupportMode;
  chargeCheck: ChargeCheckState | null;
  explanation: string;
  suggestedMainQuest: string;
  suggestedSupportMove: string;
  bossBattle?: {
    summary: string;
  } | null;
}

type ScoreBoard = Record<ControllableType, { risk: number; opportunity: number }>;

const CONTROLLABLES: ControllableType[] = [
  "awareness",
  "perspective",
  "habit",
  "wellness",
  "environment",
];

function createScoreBoard(): ScoreBoard {
  return {
    awareness: { risk: 0, opportunity: 0 },
    perspective: { risk: 0, opportunity: 0 },
    habit: { risk: 0, opportunity: 0 },
    wellness: { risk: 0, opportunity: 0 },
    environment: { risk: 0, opportunity: 0 },
  };
}

function pickHighest(
  scores: ScoreBoard,
  key: "risk" | "opportunity",
  fallback: ControllableType,
): ControllableType {
  let winner = fallback;
  let best = scores[fallback][key];

  for (const controllable of CONTROLLABLES) {
    if (scores[controllable][key] > best) {
      winner = controllable;
      best = scores[controllable][key];
    }
  }

  return best > 0 ? winner : fallback;
}

function toHoursAndMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getFallbackOpportunityMode(mode: SupportMode): ControllableType {
  switch (mode) {
    case "recover":
      return "awareness";
    case "protect":
      return "environment";
    case "stretch":
      return "habit";
    default:
      return "perspective";
  }
}

function buildExplanation(
  chargeState: ChargeState,
  supportMode: SupportMode,
  input: SignalInterpreterInput,
): string {
  const calendar = input.calendar;
  const wearable = input.wearable;
  const checkIn = input.checkIn;

  const lowRecovery = wearable?.recovery !== null && wearable?.recovery !== undefined && wearable.recovery < 34;
  const strongRecovery = wearable?.recovery !== null && wearable?.recovery !== undefined && wearable.recovery >= 67;
  const shortSleep = wearable?.sleepMinutes !== null && wearable?.sleepMinutes !== undefined && wearable.sleepMinutes < 360;
  const heavyCalendar = calendar?.dayType === "heavy" || calendar?.dayType === "admin_heavy";
  const fragmentedCalendar = calendar?.dayType === "fragmented";
  const protectedFocus = (calendar?.longestFocusBlock ?? 0) >= 90;
  const lowEnergy = checkIn?.energy !== null && checkIn?.energy !== undefined && checkIn.energy <= 2;
  const highStress = checkIn?.stress !== null && checkIn?.stress !== undefined && checkIn.stress >= 4;

  if (supportMode === "recover") {
    if (lowRecovery && heavyCalendar) {
      return `Recovery is low and the calendar is heavy. Keep the day smaller and protect charge early.`;
    }
    if (lowEnergy && highStress) {
      return `Your check-in shows low energy and high stress. Use today for repair, not pressure.`;
    }
    if (shortSleep) {
      return `Sleep came in short, so the win today is steadiness. Keep demands lighter than usual.`;
    }
    return `Signals are undercharged right now. Recovery will compound more than forcing momentum.`;
  }

  if (supportMode === "protect") {
    if (fragmentedCalendar) {
      return `The day is fragmented by switching. Protect focus and reduce avoidable decisions.`;
    }
    if (heavyCalendar && calendar?.meetingCount) {
      return `${calendar.meetingCount} meetings put pressure on the day. Protect attention between blocks.`;
    }
    if (calendar?.overloadedPeriod === "afternoon") {
      return `The afternoon looks crowded. Front-load important work while your attention is cleaner.`;
    }
    return `The day needs protection more than expansion. Make the mission smaller and cleaner.`;
  }

  if (supportMode === "stretch") {
    if (strongRecovery && protectedFocus) {
      return `Recovery is strong and you have ${toHoursAndMinutes(calendar!.longestFocusBlock)} of protected focus. Use it well.`;
    }
    if (calendar?.dayType === "focus" || calendar?.dayType === "light") {
      return `The day has room to move. This is a good time to bank meaningful progress.`;
    }
    return `Signals look strong enough to stretch. Aim at one meaningful win while charge is available.`;
  }

  if (chargeState === "strong") {
    return `Signals look strong and steady. Keep the day intentional and convert that charge into progress.`;
  }

  if (checkIn?.mood && checkIn.energy !== null && checkIn.energy !== undefined) {
    return `You checked in as ${checkIn.mood} with energy ${checkIn.energy}/5. Stay steady and work the next right move.`;
  }

  return `Signals look mostly steady. Keep the day simple and stay responsive to what changes.`;
}

function detectChargeCheck(input: SignalInterpreterInput): ChargeCheckState | null {
  const calendar = input.calendar;
  const wearable = input.wearable;
  const checkIn = input.checkIn;

  const heavyCalendar = calendar?.dayType === "heavy" || calendar?.dayType === "admin_heavy";
  const lowRecovery = wearable?.recovery !== null && wearable?.recovery !== undefined && wearable.recovery < 34;
  const shortSleep = wearable?.sleepMinutes !== null && wearable?.sleepMinutes !== undefined && wearable.sleepMinutes < 360;
  const highStrain = wearable?.strain !== null && wearable?.strain !== undefined && wearable.strain >= 14;
  const lowEnergy = checkIn?.energy !== null && checkIn?.energy !== undefined && checkIn.energy <= 2;
  const highStress = checkIn?.stress !== null && checkIn?.stress !== undefined && checkIn.stress >= 4;
  const repeatedStressRun = (checkIn?.recentLowEnergyHighStressCount ?? 0) >= 2;
  const repeatedStrainRun = (wearable?.recentLowSleepHighStrainCount ?? 0) >= 2;

  if (heavyCalendar && (lowRecovery || shortSleep)) {
    return {
      active: true,
      reason: "calendar_recovery",
      headline: "Hard stretch detected",
      summary:
        "The calendar is asking a lot while recovery is low. Treat today as a protection day: preserve your footing, lower avoidable pressure, and let one kept promise count as real progress.",
      mainQuest: "Protect the essentials and keep one promise you can actually finish.",
      supportMove: "Trim one non-essential demand and defend the next open block for food, water, or a reset.",
    };
  }

  if (repeatedStressRun || (lowEnergy && highStress)) {
    return {
      active: true,
      reason: "stress_run",
      headline: "Support mode is the right call",
      summary:
        "Your recent check-ins suggest this has been a heavier run. Keep the day honest and survivable: reduce pressure, regulate first, and let one kept promise be enough.",
      mainQuest: "Lower the bar, stay steady, and keep one promise to yourself.",
      supportMove: "Choose the smallest move that helps you feel less scattered, then stop there.",
    };
  }

  if (repeatedStrainRun || (shortSleep && highStrain)) {
    return {
      active: true,
      reason: "sleep_strain",
      headline: "Recovery needs the lead today",
      summary:
        "Sleep and strain are stacking against you. Make the day recoverable before you make it productive. Preservation and one stabilizing promise are enough.",
      mainQuest: "Preserve your energy and complete one stabilizing promise.",
      supportMove: "Take the gentlest useful move first, then protect tonight’s recovery window.",
    };
  }

  return null;
}

function buildSuggestedMainQuest(
  mode: SupportMode,
  atRisk: ControllableType,
  opportunity: ControllableType,
): string {
  if (mode === "recover") {
    switch (atRisk) {
      case "wellness":
        return "Recover charge before you ask for more output.";
      case "environment":
        return "Make the day gentler by cutting friction around you.";
      default:
        return "Slow the day down enough to regain steadiness.";
    }
  }

  if (mode === "protect") {
    switch (atRisk) {
      case "environment":
        return "Protect your focus from schedule spillover.";
      case "perspective":
        return "Keep the day understandable, not overwhelming.";
      default:
        return "Protect the few things that matter most today.";
    }
  }

  if (mode === "stretch") {
    switch (opportunity) {
      case "habit":
        return "Use today’s opening to bank a real rep.";
      case "environment":
        return "Turn today’s protected window into meaningful progress.";
      default:
        return "Lean into the strongest part of the day while it is here.";
    }
  }

  switch (opportunity) {
    case "perspective":
      return "Stay clear enough to keep the day in proportion.";
    case "habit":
      return "Keep the day moving with one repeatable win.";
    default:
      return "Keep the day steady and intentional.";
  }
}

function buildSuggestedSupportMove(
  mode: SupportMode,
  atRisk: ControllableType,
  opportunity: ControllableType,
): string {
  if (mode === "recover") {
    switch (atRisk) {
      case "wellness":
        return "Choose a lighter Wellness Move and protect one real recovery block.";
      case "awareness":
        return "Do a short Awareness Move before the next demand asks too much of you.";
      default:
        return "Lower the bar, keep one promise, and make re-entry easy.";
    }
  }

  if (mode === "protect") {
    switch (atRisk) {
      case "environment":
        return "Clear one distraction and defend your best focus window.";
      case "perspective":
        return "Shrink the mission to one outcome you can still hold clearly.";
      default:
        return "Use a protective move that reduces switching and preserves energy.";
    }
  }

  if (mode === "stretch") {
    switch (opportunity) {
      case "habit":
        return "Use Habit for one decisive rep while the signal is strong.";
      case "environment":
        return "Claim your longest focus block before admin spreads into it.";
      case "wellness":
        return "Spend strong charge on work that actually matters, not just busy work.";
      default:
        return "Pick the highest-leverage move and complete it while the window is open.";
    }
  }

  switch (opportunity) {
    case "awareness":
      return "Use Awareness for a quick read before you commit your energy.";
    case "perspective":
      return "Use Perspective to keep one stressor in proportion.";
    default:
      return "Choose one calm, repeatable move and let it be enough for now.";
  }
}

export function interpretSignals(input: SignalInterpreterInput): GameSignals | null {
  const hasCalendar = !!input.calendar?.connected || (input.calendar?.plannerCount ?? 0) > 0;
  const hasWearable = !!input.wearable && (
    input.wearable.connected ||
    input.wearable.recovery != null ||
    input.wearable.sleepMinutes != null ||
    input.wearable.strain != null ||
    (input.wearable.recentLowSleepHighStrainCount ?? 0) > 0
  );
  const hasCheckIn = !!input.checkIn && (
    !!input.checkIn.mood ||
    input.checkIn.energy != null ||
    input.checkIn.stress != null ||
    (input.checkIn.recentLowEnergyHighStressCount ?? 0) > 0
  );

  if (!hasCalendar && !hasWearable && !hasCheckIn) {
    return null;
  }

  const scores = createScoreBoard();
  const calendar = input.calendar;
  const wearable = input.wearable;
  const checkIn = input.checkIn;

  const lowRecovery = wearable?.recovery !== null && wearable?.recovery !== undefined && wearable.recovery < 34;
  const strongRecovery = wearable?.recovery !== null && wearable?.recovery !== undefined && wearable.recovery >= 67;
  const shortSleep = wearable?.sleepMinutes !== null && wearable?.sleepMinutes !== undefined && wearable.sleepMinutes < 360;
  const strongSleep = wearable?.sleepMinutes !== null && wearable?.sleepMinutes !== undefined && wearable.sleepMinutes >= 420;
  const highStrain = wearable?.strain !== null && wearable?.strain !== undefined && wearable.strain >= 14;

  const lowEnergy = checkIn?.energy !== null && checkIn?.energy !== undefined && checkIn.energy <= 2;
  const highEnergy = checkIn?.energy !== null && checkIn?.energy !== undefined && checkIn.energy >= 4;
  const highStress = checkIn?.stress !== null && checkIn?.stress !== undefined && checkIn.stress >= 4;
  const calmStress = checkIn?.stress !== null && checkIn?.stress !== undefined && checkIn.stress <= 2;

  const heavyCalendar = calendar?.dayType === "heavy" || calendar?.dayType === "admin_heavy";
  const fragmentedCalendar = calendar?.dayType === "fragmented";
  const focusCalendar = calendar?.dayType === "focus";
  const lightCalendar = calendar?.dayType === "light" || calendar?.dayType === "recovery_window";
  const protectedFocus = (calendar?.longestFocusBlock ?? 0) >= 90;
  const chargeCheck = detectChargeCheck(input);

  // Physical load drives charge risk first because it tends to cap the rest of the system.
  if (lowRecovery) {
    scores.wellness.risk += 4;
    scores.environment.risk += 1;
  }
  if (shortSleep) {
    scores.wellness.risk += 2;
    scores.awareness.risk += 1;
  }
  if (highStrain) {
    scores.wellness.risk += 2;
    scores.habit.risk += 1;
  }
  if (strongRecovery) {
    scores.wellness.opportunity += 3;
    scores.habit.opportunity += 1;
  }
  if (strongSleep) {
    scores.wellness.opportunity += 1;
  }

  // Calendar pressure mostly shows up as protector + translator work.
  if (heavyCalendar) {
    scores.environment.risk += 3;
    scores.perspective.risk += 1;
  }
  if (fragmentedCalendar) {
    scores.environment.risk += 4;
    scores.awareness.risk += 1;
  }
  if (calendar?.overloadedPeriod) {
    scores.environment.risk += 1;
  }
  if (focusCalendar || protectedFocus) {
    scores.environment.opportunity += 3;
    scores.habit.opportunity += 2;
  }
  if (lightCalendar) {
    scores.habit.opportunity += 1;
    scores.wellness.opportunity += 1;
  }

  // Self-report helps us choose whether the issue is pressure, depletion, or a clean opening.
  if (lowEnergy) {
    scores.wellness.risk += 3;
    scores.habit.risk += 1;
  }
  if (highEnergy) {
    scores.habit.opportunity += 1;
    scores.wellness.opportunity += 1;
  }
  if (highStress) {
    scores.awareness.risk += 3;
    scores.perspective.risk += 2;
    scores.wellness.risk += 1;
  }
  if (calmStress) {
    scores.perspective.opportunity += 1;
  }

  if (chargeCheck?.reason === "calendar_recovery") {
    scores.environment.risk += 2;
    scores.wellness.risk += 2;
    scores.awareness.risk += 1;
  } else if (chargeCheck?.reason === "stress_run") {
    scores.awareness.risk += 2;
    scores.perspective.risk += 2;
    scores.wellness.risk += 1;
  } else if (chargeCheck?.reason === "sleep_strain") {
    scores.wellness.risk += 3;
    scores.habit.risk += 1;
    scores.environment.risk += 1;
  }

  switch (checkIn?.mood) {
    case "anxious":
    case "overwhelmed":
      scores.awareness.risk += 2;
      scores.perspective.risk += 2;
      break;
    case "frustrated":
      scores.perspective.risk += 3;
      break;
    case "flat":
      scores.wellness.risk += 1;
      scores.habit.risk += 1;
      break;
    case "calm":
      scores.awareness.opportunity += 2;
      scores.perspective.opportunity += 1;
      break;
    case "energized":
      scores.habit.opportunity += 2;
      scores.environment.opportunity += 1;
      break;
    default:
      break;
  }

  let chargeState: ChargeState = "stable";
  if (lowRecovery || lowEnergy || (shortSleep && highStress) || (highStrain && !strongRecovery)) {
    chargeState = "undercharged";
  } else if ((strongRecovery || (highEnergy && calmStress)) && !fragmentedCalendar && !lowEnergy) {
    chargeState = "strong";
  }
  if (chargeCheck) {
    chargeState = "undercharged";
  }

  let supportMode: SupportMode = "normal";
  if (chargeState === "undercharged" && (lowRecovery || lowEnergy || highStress || shortSleep)) {
    supportMode = "recover";
  } else if (fragmentedCalendar || heavyCalendar || calendar?.overloadedPeriod) {
    supportMode = "protect";
  } else if (chargeState === "strong" && (focusCalendar || lightCalendar || protectedFocus)) {
    supportMode = "stretch";
  }
  if (chargeCheck) {
    supportMode = chargeCheck.reason === "calendar_recovery" ? "protect" : "recover";
  }

  const likelyControllableAtRisk = pickHighest(
    scores,
    "risk",
    supportMode === "recover" ? "wellness" : supportMode === "protect" ? "environment" : "awareness",
  );
  const likelyControllableOpportunity = pickHighest(
    scores,
    "opportunity",
    getFallbackOpportunityMode(supportMode),
  );

  const explanation = chargeCheck
    ? chargeCheck.summary
    : buildExplanation(chargeState, supportMode, input);
  const suggestedMainQuest = chargeCheck
    ? chargeCheck.mainQuest
    : buildSuggestedMainQuest(supportMode, likelyControllableAtRisk, likelyControllableOpportunity);
  const suggestedSupportMove = chargeCheck
    ? chargeCheck.supportMove
    : buildSuggestedSupportMove(supportMode, likelyControllableAtRisk, likelyControllableOpportunity);

  return {
    chargeState,
    likelyControllableAtRisk,
    likelyControllableOpportunity,
    supportMode,
    chargeCheck,
    explanation,
    suggestedMainQuest,
    suggestedSupportMove,
  };
}
