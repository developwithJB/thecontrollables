import type { ControllableType } from "@/components/ControllableCard";
import type { DailyMovesState, RingKey } from "@/hooks/useDailyRings";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEV_MOCK_CONTROLLABLE_XP_KEY = "dev_mock_controllable_xp";
const DEV_MOCK_DAILY_RINGS_PREFIX = "dev_mock_daily_rings";

const DEFAULT_DAILY_RINGS_STATE: DailyMovesState = {
  notice_completed: false,
  notice_response: null,
  choose_completed: false,
  choose_response: null,
  prove_completed: false,
  prove_response: null,
  charge_completed: false,
  charge_response: null,
  align_completed: false,
  align_response: null,
};

const RING_BY_CONTROLLABLE: Record<ControllableType, RingKey> = {
  awareness: "notice",
  perspective: "choose",
  habit: "prove",
  wellness: "charge",
  environment: "align",
};

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readJson<T>(key: string, fallback: T, storage: StorageLike | null = getDefaultStorage()): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Local dev storage can be unavailable in restricted browser contexts.
  }
}

export function readDevMockControllableXp(
  storage: StorageLike | null = getDefaultStorage(),
): Partial<Record<ControllableType, number>> {
  return readJson<Partial<Record<ControllableType, number>>>(DEV_MOCK_CONTROLLABLE_XP_KEY, {}, storage);
}

export function addDevMockControllableXp(
  type: ControllableType,
  amount: number,
  storage: StorageLike | null = getDefaultStorage(),
): number {
  const xp = readDevMockControllableXp(storage);
  const nextTotal = Math.max(0, Math.round((xp[type] || 0) + amount));
  writeJson(DEV_MOCK_CONTROLLABLE_XP_KEY, { ...xp, [type]: nextTotal }, storage);
  return nextTotal;
}

export function getDevMockDailyRingsKey(userId: string, date: string): string {
  return `${DEV_MOCK_DAILY_RINGS_PREFIX}_${userId}_${date}`;
}

export function readDevMockDailyRings(
  userId: string,
  date: string,
  storage: StorageLike | null = getDefaultStorage(),
): DailyMovesState {
  return readJson<DailyMovesState>(getDevMockDailyRingsKey(userId, date), DEFAULT_DAILY_RINGS_STATE, storage);
}

export function writeDevMockDailyRings(
  userId: string,
  date: string,
  state: DailyMovesState,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  writeJson(getDevMockDailyRingsKey(userId, date), state, storage);
}

export function markDevMockDailyRing(
  userId: string,
  date: string,
  type: ControllableType,
  response: string,
  storage: StorageLike | null = getDefaultStorage(),
): DailyMovesState {
  const key = RING_BY_CONTROLLABLE[type];
  const state = readDevMockDailyRings(userId, date, storage);
  const next = {
    ...state,
    [`${key}_completed`]: true,
    [`${key}_response`]: response,
  } as DailyMovesState;

  writeDevMockDailyRings(userId, date, next, storage);
  return next;
}

export function getDailyRingKeyForControllable(type: ControllableType): RingKey {
  return RING_BY_CONTROLLABLE[type];
}
