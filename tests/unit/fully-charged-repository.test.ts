import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLocalCalendarDays, getLocalDateInTimezone } from "@/domain/formation/fullyChargedJourney";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  cancelFullyChargedAttempt,
  loadFullyChargedToday,
  startFullyChargedAttempt,
} from "@/data/formation/fullyChargedRepository";

const userId = "local-qa-user";
const storageKey = `formation_fully_charged_attempt_v1_${userId}`;

describe("Fully Charged local QA repository", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  it("preserves terminal attempts and rejects a same-local-date Begin Again", async () => {
    const today = getLocalDateInTimezone("UTC");
    const first = await startFullyChargedAttempt(startInput(today, "first"));
    await cancelFullyChargedAttempt({
      userId,
      attemptId: first.attemptId,
      reasonCode: "user_cancelled",
      localOnly: true,
    });

    await expect(
      startFullyChargedAttempt({ ...startInput(today, "same-day"), previousAttemptId: first.attemptId }),
    ).rejects.toThrow(/after the previous local attempt day/i);

    const second = await startFullyChargedAttempt({
      ...startInput(addLocalCalendarDays(today, 1), "next-day"),
      previousAttemptId: first.attemptId,
    });
    expect(second.sequenceNumber).toBe(2);
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { attempts: unknown[] };
    expect(stored.attempts).toHaveLength(2);
  });

  it("ends an active local attempt when its unclosed canonical day is overdue", async () => {
    const yesterday = addLocalCalendarDays(getLocalDateInTimezone("UTC"), -1);
    localStorage.setItem(storageKey, JSON.stringify({
      version: 2,
      attempts: [{
        version: 1,
        attemptId: "overdue-attempt",
        sequenceNumber: 1,
        status: "active",
        startLocalDate: yesterday,
        startTimezone: "UTC",
        completedDays: 0,
        currentDayNumber: 1,
        previousAttemptId: null,
        startIdempotencyKey: "overdue",
        mainPromise: "One honest promise.",
        endedOnDay: null,
        terminalLocalDate: null,
      }],
    }));

    const state = await loadFullyChargedToday(userId, true);
    expect(state?.attemptStatus).toBe("ended");
    expect(state?.completedDays).toBe(0);
    expect(state?.dayNumber).toBeNull();
  });
});

function startInput(startLocalDate: string, idempotencyKey: string) {
  return {
    userId,
    startLocalDate,
    timezone: "UTC",
    mainPromise: "One honest promise.",
    strictOptIn: true,
    rulesAccepted: true,
    personalCovenantAccepted: true,
    environmentPrepared: true,
    privacySafetyAcknowledged: true,
    idempotencyKey,
    previousAttemptId: null,
    localOnly: true,
  };
}
