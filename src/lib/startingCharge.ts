import type { ControllableType } from "@/components/ControllableCard";
import { CONTROLLABLE_GUIDE_IDS, getControllableGuide } from "@/lib/controllables";
import { getControllableVisualIcon } from "@/lib/controllableVisuals";

export type StartingChargeCurrentState =
  | "clear"
  | "scattered"
  | "motivated"
  | "tired"
  | "stuck"
  | "ready";

export type StartingChargeEgoSignal =
  | "comparison"
  | "overthinking"
  | "control"
  | "avoidance"
  | "shame"
  | "all-or-nothing";

export type StartingChargePromise =
  | "move_10"
  | "drink_water"
  | "clear_blocker"
  | "send_message"
  | "quiet_minute"
  | "write_true"
  | "custom";

export interface StartingChargeAnswers {
  currentState: StartingChargeCurrentState;
  strongestControllable: ControllableType;
  needsChargeControllable: ControllableType;
  egoSignal: StartingChargeEgoSignal;
  firstPromise: StartingChargePromise;
  customPromise?: string;
}

export interface StartingChargeMission {
  id: "mission_001";
  title: string;
  instruction: string;
  targetControllable: ControllableType;
  promiseLabel: string;
  safeShareTitle: string;
}

export interface StartingChargeResult {
  answers: StartingChargeAnswers;
  strongestControllable: ControllableType;
  chargingControllable: ControllableType;
  egoSignal: StartingChargeEgoSignal;
  firstMission: StartingChargeMission;
  startingSelfTrustLevel: number;
  startingSelfTrustPercent: number;
  chargePercentages: Record<ControllableType, number>;
  completedAt: string;
}

export interface StartingChargeProofCard {
  headline: "I started tracking My Controllables.";
  strongestLine: string;
  chargingLine: string;
  missionLine: string;
  proofLine: "Control the Controllables one day at a time.";
  icon: string;
  brandTitle: "The Dashboard";
  brandSubtitle: "My Controllables";
  shareText: string;
  includeLocation: false;
  identityLine: null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STARTING_CHARGE_STORAGE_PREFIX = "starting_charge_profile";

export const STARTING_CHARGE_CURRENT_STATE_LABELS: Record<StartingChargeCurrentState, string> = {
  clear: "Clear",
  scattered: "Scattered",
  motivated: "Motivated",
  tired: "Tired",
  stuck: "Stuck",
  ready: "Ready",
};

export const STARTING_CHARGE_EGO_SIGNAL_LABELS: Record<StartingChargeEgoSignal, string> = {
  comparison: "Comparison",
  overthinking: "Overthinking",
  control: "Control",
  avoidance: "Avoidance",
  shame: "Shame",
  "all-or-nothing": "All-or-nothing",
};

export const STARTING_CHARGE_PROMISE_LABELS: Record<StartingChargePromise, string> = {
  move_10: "Move for 10 minutes",
  drink_water: "Drink water first",
  clear_blocker: "Clear one blocker",
  send_message: "Send one message",
  quiet_minute: "Take one quiet minute",
  write_true: "Write what is true",
  custom: "Custom promise",
};

const CONTROLLABLE_NAMES: Record<ControllableType, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

const MISSION_TITLES_BY_CONTROLLABLE: Record<ControllableType, string> = {
  awareness: "Notice the signal",
  perspective: "Find the wider view",
  habit: "Keep one promise",
  wellness: "Protect the vessel",
  environment: "Clear the runway",
};

const CURRENT_STATE_MODIFIERS: Record<StartingChargeCurrentState, Partial<Record<ControllableType, number>>> = {
  clear: { awareness: 14, perspective: 8, habit: 4 },
  scattered: { awareness: -8, perspective: -6, environment: -10, habit: 4 },
  motivated: { habit: 12, environment: 8, wellness: 4 },
  tired: { wellness: -14, perspective: 4, awareness: -4 },
  stuck: { perspective: -8, environment: -8, habit: -6, awareness: 4 },
  ready: { awareness: 6, perspective: 6, habit: 14, wellness: 6, environment: 8 },
};

const PROMISE_CONTROLLABLES: Record<StartingChargePromise, ControllableType> = {
  move_10: "wellness",
  drink_water: "wellness",
  clear_blocker: "environment",
  send_message: "environment",
  quiet_minute: "awareness",
  write_true: "perspective",
  custom: "habit",
};

const FORBIDDEN_SHARE_PATTERNS = [
  /\bprivate reflections?\b/i,
  /\bwellness details?\b/i,
  /\bmoney\b/i,
  /\bcalendar\b/i,
  /\bjournal\b/i,
  /\bAI guidance\b/i,
  /\bcustom promise\b/i,
  /\bcity\b|\bstate\b/i,
  /\bevolution\b|\bevolve\b|\bmonster\b|\bcreature\b|\bbattle\b/i,
  /\byou failed\b|\bstreak broken\b/i,
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(8, Math.min(Math.round(value), 96));
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }
}

function getStartingChargeStorageKey(userId: string | null | undefined): string {
  return `${STARTING_CHARGE_STORAGE_PREFIX}_${userId || "local"}`;
}

function cleanCustomPromise(value?: string): string {
  return value?.trim().replace(/\s+/g, " ").slice(0, 80) || "";
}

function getMissionInstruction(answers: StartingChargeAnswers): string {
  if (answers.firstPromise === "custom") {
    return cleanCustomPromise(answers.customPromise) || "Keep one small promise.";
  }

  return `${STARTING_CHARGE_PROMISE_LABELS[answers.firstPromise]}.`;
}

export function scoreStartingCharge(answers: StartingChargeAnswers): StartingChargeResult {
  const scores = CONTROLLABLE_GUIDE_IDS.reduce(
    (acc, type) => ({ ...acc, [type]: 42 }),
    {} as Record<ControllableType, number>,
  );

  const stateModifiers = CURRENT_STATE_MODIFIERS[answers.currentState];
  for (const type of CONTROLLABLE_GUIDE_IDS) {
    scores[type] += stateModifiers[type] ?? 0;
  }

  scores[answers.strongestControllable] += 24;
  scores[answers.needsChargeControllable] -= 14;
  scores[PROMISE_CONTROLLABLES[answers.firstPromise]] += 6;

  const chargePercentages = CONTROLLABLE_GUIDE_IDS.reduce(
    (acc, type) => ({ ...acc, [type]: clampPercent(scores[type]) }),
    {} as Record<ControllableType, number>,
  );
  const averageCharge = Math.round(
    CONTROLLABLE_GUIDE_IDS.reduce((sum, type) => sum + chargePercentages[type], 0) / CONTROLLABLE_GUIDE_IDS.length,
  );
  const missionTitle = MISSION_TITLES_BY_CONTROLLABLE[answers.needsChargeControllable];

  return {
    answers: {
      ...answers,
      customPromise: cleanCustomPromise(answers.customPromise),
    },
    strongestControllable: answers.strongestControllable,
    chargingControllable: answers.needsChargeControllable,
    egoSignal: answers.egoSignal,
    firstMission: {
      id: "mission_001",
      title: missionTitle,
      instruction: getMissionInstruction(answers),
      targetControllable: answers.needsChargeControllable,
      promiseLabel: STARTING_CHARGE_PROMISE_LABELS[answers.firstPromise],
      safeShareTitle: missionTitle,
    },
    startingSelfTrustLevel: 1,
    startingSelfTrustPercent: Math.max(10, Math.min(averageCharge, 90)),
    chargePercentages,
    completedAt: new Date().toISOString(),
  };
}

export function saveStartingChargeResult(
  userId: string | null | undefined,
  result: StartingChargeResult,
  storage: StorageLike | null = getDefaultStorage(),
): StartingChargeResult {
  storage?.setItem(getStartingChargeStorageKey(userId), JSON.stringify(result));
  return result;
}

export function getStartingChargeResult(
  userId: string | null | undefined,
  storage: StorageLike | null = getDefaultStorage(),
): StartingChargeResult | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(getStartingChargeStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StartingChargeResult;
    if (!parsed?.strongestControllable || !parsed?.chargingControllable || !parsed?.firstMission) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStartingChargeResult(
  userId: string | null | undefined,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  storage?.removeItem(getStartingChargeStorageKey(userId));
}

export function buildStartingChargeProofCard(
  result: StartingChargeResult,
  options: { includeCustomPromise?: boolean } = {},
): StartingChargeProofCard {
  const strongest = CONTROLLABLE_NAMES[result.strongestControllable];
  const charging = CONTROLLABLE_NAMES[result.chargingControllable];
  const customPromise =
    result.answers.firstPromise === "custom" && options.includeCustomPromise
      ? cleanCustomPromise(result.answers.customPromise)
      : "";
  const missionTitle = customPromise || result.firstMission.safeShareTitle;
  const payload: Omit<StartingChargeProofCard, "shareText"> = {
    headline: "I started tracking My Controllables.",
    strongestLine: `Strongest: ${strongest}`,
    chargingLine: `Charging: ${charging}`,
    missionLine: `Mission 001: ${missionTitle}`,
    proofLine: "Control the Controllables one day at a time.",
    icon: getControllableVisualIcon(result.chargingControllable),
    brandTitle: "The Dashboard",
    brandSubtitle: "My Controllables",
    includeLocation: false,
    identityLine: null,
  };

  return {
    ...payload,
    shareText: [
      payload.headline,
      payload.strongestLine,
      payload.chargingLine,
      payload.missionLine,
      payload.proofLine,
      "",
      payload.brandTitle,
      payload.brandSubtitle,
    ].join("\n"),
  };
}

export function isPrivacySafeStartingChargeProofCard(card: StartingChargeProofCard): boolean {
  return FORBIDDEN_SHARE_PATTERNS.every((pattern) => !pattern.test(card.shareText));
}

export function getStartingChargeControllableName(type: ControllableType): string {
  return getControllableGuide(type).name;
}
