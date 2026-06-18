import type { ControllableType } from "@/components/ControllableCard";
import { getBookControllable } from "@/lib/bookWorld";

export type LocalMissionVisibility = "private" | "anonymous" | "public";
export type LocalSignalType = "weather" | "event" | "community" | "seasonal" | "civic" | "generic";
export type MockLocalSignal =
  | "sunny"
  | "rainy"
  | "cold"
  | "major_city_event"
  | "farmers_market"
  | "volunteer_opportunity"
  | "sports_game_day"
  | "community_gathering"
  | "generic_city_day";

export interface LocalMissionPreferences {
  city: string;
  state: string;
  localMissionsEnabled: boolean;
  localMissionVisibility: LocalMissionVisibility;
  showCityOnShareCards: boolean;
}

export interface LocalMission {
  id: string;
  type: "local";
  city: string;
  state: string;
  localSignalType: LocalSignalType;
  targetControllable: ControllableType;
  title: string;
  instruction: string;
  shortWhy: string;
  xpReward: number;
  selfTrustReward: number;
  estimatedMinutes: number;
  completed: boolean;
  completedAt: string | null;
}

export interface LocalMissionCompletionResult {
  mission: LocalMission;
  xpAwarded: number;
  selfTrustAwarded: number;
  alreadyCompleted: boolean;
}

export interface LocalMissionProofCopy {
  title: string;
  body: string;
}

export const DEFAULT_LOCAL_MISSION_PREFERENCES: LocalMissionPreferences = {
  city: "",
  state: "",
  localMissionsEnabled: false,
  localMissionVisibility: "private",
  showCityOnShareCards: false,
};

const MOCK_SIGNAL_ROTATION: MockLocalSignal[] = [
  "sunny",
  "rainy",
  "cold",
  "major_city_event",
  "farmers_market",
  "volunteer_opportunity",
  "sports_game_day",
  "community_gathering",
  "generic_city_day",
];

export function normalizeLocalMissionPreferences(value: unknown): LocalMissionPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_LOCAL_MISSION_PREFERENCES };

  const source = value as Partial<LocalMissionPreferences>;
  return {
    city: typeof source.city === "string" ? source.city.slice(0, 60) : "",
    state: typeof source.state === "string" ? source.state.slice(0, 40) : "",
    localMissionsEnabled: source.localMissionsEnabled === true,
    localMissionVisibility: isLocalMissionVisibility(source.localMissionVisibility)
      ? source.localMissionVisibility
      : "private",
    showCityOnShareCards: source.showCityOnShareCards === true,
  };
}

export function getLocalMissionDropStorageKey(userId: string | null | undefined): string {
  return `local_mission_drop_${userId || "guest"}`;
}

export function getLocalMissionDayKey(date = new Date()): string {
  return date.toLocaleDateString("sv-SE");
}

export function selectMockLocalSignal(input: {
  city?: string;
  state?: string;
  date?: Date;
}): MockLocalSignal {
  const date = input.date ?? new Date();
  const key = `${getLocalMissionDayKey(date)}:${input.city ?? ""}:${input.state ?? ""}`;
  const hash = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
  return MOCK_SIGNAL_ROTATION[hash % MOCK_SIGNAL_ROTATION.length];
}

export function generateLocalMission(input: {
  preferences: LocalMissionPreferences;
  signal?: MockLocalSignal;
  date?: Date;
  completedAt?: string | null;
}): LocalMission | null {
  const preferences = normalizeLocalMissionPreferences(input.preferences);
  if (!preferences.localMissionsEnabled) return null;

  const date = input.date ?? new Date();
  const signal = input.signal ?? selectMockLocalSignal({ city: preferences.city, state: preferences.state, date });
  const profile = getLocalSignalMissionProfile(signal, date);
  const city = preferences.city.trim();
  const state = preferences.state.trim();
  const scopeLabel = city || state || "Local";
  const completedAt = input.completedAt ?? null;

  return {
    id: `local-${getLocalMissionDayKey(date)}-${slugify(scopeLabel)}-${signal}`,
    type: "local",
    city,
    state,
    localSignalType: profile.localSignalType,
    targetControllable: profile.targetControllable,
    title: `${scopeLabel} Mission`,
    instruction: profile.instruction,
    shortWhy: profile.shortWhy,
    xpReward: profile.xpReward,
    selfTrustReward: profile.selfTrustReward,
    estimatedMinutes: profile.estimatedMinutes,
    completed: Boolean(completedAt),
    completedAt,
  };
}

export function completeLocalMission(
  mission: LocalMission,
  completedAt = new Date().toISOString(),
): LocalMissionCompletionResult {
  if (mission.completed) {
    return {
      mission,
      xpAwarded: 0,
      selfTrustAwarded: 0,
      alreadyCompleted: true,
    };
  }

  return {
    mission: {
      ...mission,
      completed: true,
      completedAt,
    },
    xpAwarded: mission.xpReward,
    selfTrustAwarded: mission.selfTrustReward,
    alreadyCompleted: false,
  };
}

export function getLocalMissionProofCopy(
  mission: LocalMission,
  preferences: LocalMissionPreferences,
): LocalMissionProofCopy {
  const safePreferences = normalizeLocalMissionPreferences(preferences);
  const guide = getBookControllable(mission.targetControllable);
  const canShowCity =
    safePreferences.localMissionVisibility === "public" &&
    safePreferences.showCityOnShareCards &&
    Boolean(mission.city || mission.state);
  const place = [mission.city, mission.state].filter(Boolean).join(", ");

  if (canShowCity && mission.city) {
    return {
      title: `${mission.city} Mission Complete`,
      body: `I charged ${guide.name} in ${mission.city} today.`,
    };
  }

  if (canShowCity && place) {
    return {
      title: `${place} Mission Complete`,
      body: `I charged ${guide.name} in ${place} today.`,
    };
  }

  return {
    title: "Local Mission Complete",
    body: `I charged ${guide.name} today.`,
  };
}

function getLocalSignalMissionProfile(
  signal: MockLocalSignal,
  date: Date,
): Omit<LocalMission, "id" | "type" | "city" | "state" | "title" | "completed" | "completedAt"> {
  switch (signal) {
    case "sunny":
      return {
        localSignalType: "weather",
        targetControllable: "wellness",
        instruction: "Get 10 minutes outside before sunset.",
        shortWhy: "Use the light to recharge your body.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 10,
      };
    case "rainy":
      return {
        localSignalType: "weather",
        targetControllable: "perspective",
        instruction: "Reframe one delay as protected pace.",
        shortWhy: "Let the weather slow the story down.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 5,
      };
    case "cold":
      return {
        localSignalType: "weather",
        targetControllable: date.getDate() % 2 === 0 ? "habit" : "wellness",
        instruction: "Choose one small warm-up move before your main task.",
        shortWhy: "Cold days reward preparation over pressure.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 8,
      };
    case "farmers_market":
      return {
        localSignalType: "community",
        targetControllable: "wellness",
        instruction: "Pick one whole-food choice for today.",
        shortWhy: "Let your city help protect the vessel.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 15,
      };
    case "volunteer_opportunity":
      return {
        localSignalType: "civic",
        targetControllable: "environment",
        instruction: "Find one practical way to serve near you.",
        shortWhy: "Environment includes what you contribute around you.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 10,
      };
    case "sports_game_day":
      return {
        localSignalType: "event",
        targetControllable: "environment",
        instruction: "Use the city energy to connect with one person.",
        shortWhy: "Shared attention can become a better environment.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 10,
      };
    case "community_gathering":
      return {
        localSignalType: "community",
        targetControllable: "environment",
        instruction: "Step into one real-world connection point.",
        shortWhy: "Your surroundings can carry part of the work.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 15,
      };
    case "major_city_event":
      return {
        localSignalType: "event",
        targetControllable: date.getDate() % 2 === 0 ? "awareness" : "perspective",
        instruction: "Notice what the city noise is asking from your attention.",
        shortWhy: "Big local energy is a chance to choose your lens.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 5,
      };
    case "generic_city_day":
    default:
      return {
        localSignalType: "generic",
        targetControllable: "awareness",
        instruction: "Name one thing your environment is telling you today.",
        shortWhy: "Your city is signal, not background.",
        xpReward: 30,
        selfTrustReward: 10,
        estimatedMinutes: 5,
      };
  }
}

function isLocalMissionVisibility(value: unknown): value is LocalMissionVisibility {
  return value === "private" || value === "anonymous" || value === "public";
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "local";
}
