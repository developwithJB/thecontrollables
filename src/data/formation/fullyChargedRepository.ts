import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CIRCUIT_TYPES, FORMATION_RULE_VERSION, type FormationCircuitEntry } from "@/domain/formation/circuits";
import {
  FULLY_CHARGED_CONTENT_BUNDLE_VERSION,
  FULLY_CHARGED_TOTAL_DAYS,
  addLocalCalendarDays,
  getLocalDateInTimezone,
  seasonForFullyChargedDay,
} from "@/domain/formation/fullyChargedJourney";
import type { FormationSeason } from "@/domain/formation/content";

export type FullyChargedPersistedStatus = "scheduled" | "active" | "ended" | "completed" | "cancelled";
export type FullyChargedPersistedDayStatus = "scheduled" | "open" | "complete" | "incomplete";

export interface FullyChargedTodayState {
  attemptId: string;
  sequenceNumber: number;
  attemptStatus: FullyChargedPersistedStatus;
  rulesVersion: string;
  contentBundleVersion: string;
  startLocalDate: string;
  startTimezone: string;
  completedDays: number;
  dayNumber: number | null;
  localDate: string | null;
  season: FormationSeason | null;
  dayStatus: FullyChargedPersistedDayStatus | null;
  opensAt: string | null;
  closesAt: string | null;
  localOnly: boolean;
}

export interface StartFullyChargedAttemptInput {
  userId: string;
  startLocalDate: string;
  timezone: string;
  mainPromise: string;
  strictOptIn: boolean;
  rulesAccepted: boolean;
  personalCovenantAccepted: boolean;
  environmentPrepared: boolean;
  privacySafetyAcknowledged: boolean;
  idempotencyKey: string;
  previousAttemptId?: string | null;
  localOnly: boolean;
}

interface LocalFullyChargedAttempt {
  version: 1;
  attemptId: string;
  sequenceNumber: number;
  status: FullyChargedPersistedStatus;
  startLocalDate: string;
  startTimezone: string;
  completedDays: number;
  currentDayNumber: number | null;
  previousAttemptId: string | null;
  startIdempotencyKey: string;
  mainPromise: string;
  endedOnDay: number | null;
  terminalLocalDate?: string | null;
}

interface LocalFullyChargedStore {
  version: 2;
  attempts: LocalFullyChargedAttempt[];
}

export async function loadFullyChargedToday(
  userId: string,
  localOnly: boolean,
): Promise<FullyChargedTodayState | null> {
  if (localOnly) {
    const attempt = readLocalAttempt(userId);
    return attempt ? mapLocalAttempt(attempt) : null;
  }

  const { data, error } = await supabase.rpc("get_fully_charged_today");
  if (error) throw error;
  return normalizeTodayState(data, false);
}

export async function startFullyChargedAttempt(
  input: StartFullyChargedAttemptInput,
): Promise<FullyChargedTodayState> {
  validateStartInput(input);

  if (input.localOnly) {
    const existing = readLocalAttempt(input.userId);
    if (existing?.startIdempotencyKey === input.idempotencyKey) return mapLocalAttempt(existing);
    if (existing && ["scheduled", "active"].includes(existing.status)) {
      throw new Error("An active Fully Charged attempt already exists.");
    }
    if (existing?.terminalLocalDate === input.startLocalDate) {
      throw new Error("Begin again on a date after the previous local attempt day.");
    }
    const sequenceNumber = (existing?.sequenceNumber ?? 0) + 1;
    const attempt: LocalFullyChargedAttempt = {
      version: 1,
      attemptId: `local-fully-charged-${input.userId}-${sequenceNumber}`,
      sequenceNumber,
      status: input.startLocalDate === getLocalDateInTimezone(input.timezone) ? "active" : "scheduled",
      startLocalDate: input.startLocalDate,
      startTimezone: input.timezone,
      completedDays: 0,
      currentDayNumber: 1,
      previousAttemptId: input.previousAttemptId ?? existing?.attemptId ?? null,
      startIdempotencyKey: input.idempotencyKey,
      mainPromise: input.mainPromise.trim().slice(0, 1000),
      endedOnDay: null,
      terminalLocalDate: null,
    };
    writeLocalAttempt(input.userId, attempt);
    return mapLocalAttempt(attempt);
  }

  const { error } = await supabase.rpc("start_fully_charged_attempt", {
    p_start_local_date: input.startLocalDate,
    p_timezone: input.timezone,
    p_main_promise: input.mainPromise.trim(),
    p_rules_version: FORMATION_RULE_VERSION,
    p_content_bundle_version: FULLY_CHARGED_CONTENT_BUNDLE_VERSION,
    p_strict_opt_in: input.strictOptIn,
    p_rules_accepted: input.rulesAccepted,
    p_personal_covenant_accepted: input.personalCovenantAccepted,
    p_environment_prepared: input.environmentPrepared,
    p_privacy_safety_acknowledged: input.privacySafetyAcknowledged,
    p_idempotency_key: input.idempotencyKey,
    p_previous_attempt_id: input.previousAttemptId ?? null,
  });
  if (error) throw error;

  const today = await loadFullyChargedToday(input.userId, false);
  if (!today) throw new Error("Fully Charged attempt started without a current-day projection.");
  return today;
}

export async function closeFullyChargedDay(input: {
  userId: string;
  attemptId: string;
  idempotencyKey: string;
  circuitHistory: FormationCircuitEntry[];
  localOnly: boolean;
}): Promise<FullyChargedTodayState> {
  if (input.localOnly) {
    const attempt = readLocalAttempt(input.userId);
    if (!attempt || attempt.attemptId !== input.attemptId || attempt.status !== "active" || !attempt.currentDayNumber) {
      throw new Error("No active Fully Charged day is available to close.");
    }
    const localDate = addLocalCalendarDays(attempt.startLocalDate, attempt.currentDayNumber - 1);
    const completedCircuits = new Set(
      input.circuitHistory
        .filter(
          (entry) =>
            entry.track === "fully_charged_75" &&
            entry.localDate === localDate &&
            entry.completionState === "complete",
        )
        .map((entry) => entry.circuit),
    );
    const missingCircuits = CIRCUIT_TYPES.filter((circuit) => !completedCircuits.has(circuit));
    if (missingCircuits.length) {
      throw new Error(`Complete ${missingCircuits.join(", ")} before closing today.`);
    }

    attempt.completedDays += 1;
    if (attempt.completedDays === FULLY_CHARGED_TOTAL_DAYS) {
      attempt.status = "completed";
      attempt.currentDayNumber = null;
      attempt.terminalLocalDate = localDate;
    } else {
      attempt.currentDayNumber += 1;
    }
    writeLocalAttempt(input.userId, attempt);
    return mapLocalAttempt(attempt);
  }

  const { error } = await supabase.rpc("close_fully_charged_day", {
    p_attempt_id: input.attemptId,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  const refreshed = await loadFullyChargedToday(input.userId, false);
  if (!refreshed) throw new Error("Fully Charged closeout returned no journey projection.");
  return refreshed;
}

export async function cancelFullyChargedAttempt(input: {
  userId: string;
  attemptId: string;
  reasonCode: "user_cancelled" | "health_safety";
  localOnly: boolean;
}): Promise<FullyChargedTodayState> {
  if (input.localOnly) {
    const attempt = readLocalAttempt(input.userId);
    if (!attempt || attempt.attemptId !== input.attemptId || !["scheduled", "active"].includes(attempt.status)) {
      throw new Error("No active Fully Charged attempt is available to end.");
    }
    attempt.status = "cancelled";
    attempt.terminalLocalDate = attempt.currentDayNumber
      ? addLocalCalendarDays(attempt.startLocalDate, attempt.currentDayNumber - 1)
      : getLocalDateInTimezone(attempt.startTimezone);
    attempt.currentDayNumber = null;
    writeLocalAttempt(input.userId, attempt);
    return mapLocalAttempt(attempt);
  }

  const { error } = await supabase.rpc("cancel_fully_charged_attempt", {
    p_attempt_id: input.attemptId,
    p_reason_code: input.reasonCode,
  });
  if (error) throw error;
  const today = await loadFullyChargedToday(input.userId, false);
  if (!today) throw new Error("Fully Charged cancellation returned no journey projection.");
  return today;
}

function validateStartInput(input: StartFullyChargedAttemptInput): void {
  if (!input.mainPromise.trim()) throw new Error("Name one keepable Main Promise before starting.");
  if (
    !input.strictOptIn ||
    !input.rulesAccepted ||
    !input.personalCovenantAccepted ||
    !input.environmentPrepared ||
    !input.privacySafetyAcknowledged
  ) {
    throw new Error("Complete every readiness acknowledgment before starting.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startLocalDate)) throw new Error("Choose a valid start date.");
  if (!input.timezone.trim()) throw new Error("Confirm an IANA timezone before starting.");
  let localToday: string;
  try {
    localToday = getLocalDateInTimezone(input.timezone);
  } catch {
    throw new Error("Confirm a valid IANA timezone before starting.");
  }
  if (input.startLocalDate < localToday || input.startLocalDate > addLocalCalendarDays(localToday, 30)) {
    throw new Error("Choose today or a start date within the next 30 days.");
  }
}

function getLocalStorageKey(userId: string): string {
  return `formation_fully_charged_attempt_v1_${userId}`;
}

function readLocalAttempt(userId: string): LocalFullyChargedAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const attempts = readLocalAttemptRecords(userId);
    const parsed = attempts.sort((left, right) => right.sequenceNumber - left.sequenceNumber)[0];
    if (!parsed) return null;
    const localToday = getLocalDateInTimezone(parsed.startTimezone);
    if (parsed.status === "scheduled" && parsed.startLocalDate <= localToday) {
      parsed.status = "active";
      writeLocalAttempt(userId, parsed);
    }
    if (parsed.status === "active" && parsed.currentDayNumber) {
      const currentLocalDate = addLocalCalendarDays(parsed.startLocalDate, parsed.currentDayNumber - 1);
      if (currentLocalDate < localToday) {
        parsed.status = "ended";
        parsed.endedOnDay = parsed.currentDayNumber;
        parsed.terminalLocalDate = currentLocalDate;
        parsed.currentDayNumber = null;
        writeLocalAttempt(userId, parsed);
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalAttempt(userId: string, attempt: LocalFullyChargedAttempt): void {
  if (typeof window === "undefined") return;
  const existing = readLocalAttemptRecords(userId).filter((candidate) => candidate.attemptId !== attempt.attemptId);
  const store: LocalFullyChargedStore = {
    version: 2,
    attempts: [...existing, attempt].sort((left, right) => left.sequenceNumber - right.sequenceNumber),
  };
  localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(store));
}

function readLocalAttemptRecords(userId: string): LocalFullyChargedAttempt[] {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalFullyChargedStore | LocalFullyChargedAttempt;
    if (parsed.version === 2 && "attempts" in parsed && Array.isArray(parsed.attempts)) {
      return parsed.attempts.filter((attempt) => attempt.version === 1 && typeof attempt.attemptId === "string");
    }
    if (parsed.version === 1 && "attemptId" in parsed && typeof parsed.attemptId === "string") return [parsed];
  } catch {
    return [];
  }
  return [];
}

function mapLocalAttempt(attempt: LocalFullyChargedAttempt): FullyChargedTodayState {
  const dayNumber = attempt.currentDayNumber;
  const localDate = dayNumber ? addLocalCalendarDays(attempt.startLocalDate, dayNumber - 1) : null;
  const today = getLocalDateInTimezone(attempt.startTimezone);
  const activeToday = attempt.status === "active" && localDate === today;
  return {
    attemptId: attempt.attemptId,
    sequenceNumber: attempt.sequenceNumber,
    attemptStatus: attempt.status,
    rulesVersion: FORMATION_RULE_VERSION,
    contentBundleVersion: FULLY_CHARGED_CONTENT_BUNDLE_VERSION,
    startLocalDate: attempt.startLocalDate,
    startTimezone: attempt.startTimezone,
    completedDays: attempt.completedDays,
    dayNumber,
    localDate,
    season: dayNumber ? seasonForFullyChargedDay(dayNumber) : null,
    dayStatus: dayNumber ? (activeToday ? "open" : "scheduled") : null,
    opensAt: null,
    closesAt: null,
    localOnly: true,
  };
}

function normalizeTodayState(value: Json | null, localOnly: boolean): FullyChargedTodayState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, Json | undefined>;
  const attemptId = asString(row.attemptId);
  const attemptStatus = asAttemptStatus(row.attemptStatus);
  if (!attemptId || !attemptStatus) return null;
  return {
    attemptId,
    sequenceNumber: asNumber(row.sequenceNumber) ?? 1,
    attemptStatus,
    rulesVersion: asString(row.rulesVersion) ?? FORMATION_RULE_VERSION,
    contentBundleVersion: asString(row.contentBundleVersion) ?? FULLY_CHARGED_CONTENT_BUNDLE_VERSION,
    startLocalDate: asString(row.startLocalDate) ?? "",
    startTimezone: asString(row.startTimezone) ?? "UTC",
    completedDays: asNumber(row.completedDays) ?? 0,
    dayNumber: asNumber(row.dayNumber),
    localDate: asString(row.localDate),
    season: asSeason(row.season),
    dayStatus: asDayStatus(row.dayStatus),
    opensAt: asString(row.opensAt),
    closesAt: asString(row.closesAt),
    localOnly,
  };
}

const asString = (value: Json | undefined): string | null => (typeof value === "string" ? value : null);
const asNumber = (value: Json | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asAttemptStatus = (value: Json | undefined): FullyChargedPersistedStatus | null =>
  typeof value === "string" && ["scheduled", "active", "ended", "completed", "cancelled"].includes(value)
    ? (value as FullyChargedPersistedStatus)
    : null;
const asDayStatus = (value: Json | undefined): FullyChargedPersistedDayStatus | null =>
  typeof value === "string" && ["scheduled", "open", "complete", "incomplete"].includes(value)
    ? (value as FullyChargedPersistedDayStatus)
    : null;
const asSeason = (value: Json | undefined): FormationSeason | null =>
  typeof value === "string" && ["be_with_jesus", "become_like_jesus", "do_what_jesus_did"].includes(value)
    ? (value as FormationSeason)
    : null;
