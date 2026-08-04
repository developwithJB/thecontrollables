import { describe, expect, it } from "vitest";
import {
  COVENANT_PROMISE_KEYS,
  calculateCovenantEvidence,
  createEmptyCovenantCheckin,
  getCovenantDayProgress,
  isCovenantDayComplete,
  normalizeCovenantRules,
} from "@/lib/covenant";

describe("covenant challenge", () => {
  it("normalizes challenge rules and falls back to the full covenant", () => {
    expect(normalizeCovenantRules(["jesus_first", "bible_read", "not-a-rule", "bible_read"])).toEqual([
      "jesus_first",
      "bible_read",
    ]);
    expect(normalizeCovenantRules(null)).toEqual(COVENANT_PROMISE_KEYS);
  });

  it("only completes a covenant day when every selected promise is kept", () => {
    const checkin = createEmptyCovenantCheckin("challenge", "user", "2026-08-04");
    checkin.jesus_first = true;
    checkin.bible_read = true;

    expect(isCovenantDayComplete(checkin, ["jesus_first", "bible_read"])).toBe(true);
    expect(isCovenantDayComplete(checkin, ["jesus_first", "bible_read", "workout"])).toBe(false);
  });

  it("turns daily obedience into lifetime evidence", () => {
    const first = createEmptyCovenantCheckin("challenge", "user", "2026-08-02");
    Object.assign(first, {
      jesus_first: true,
      bible_read: true,
      alcohol_free: true,
      workout_count: 2,
      miles: 4.2,
      nutrition_kept: true,
      water_goal: true,
      service_count: 1,
      people_encouraged: 2,
      journal_entry: true,
      scripture_memorized_count: 1,
      day_complete: true,
    });

    const second = createEmptyCovenantCheckin("challenge", "user", "2026-08-03");
    Object.assign(second, {
      jesus_first: true,
      bible_read: true,
      alcohol_free: true,
      workout_count: 1,
      miles: 3,
      nutrition_kept: true,
      water_goal: true,
      service_count: 1,
      day_complete: true,
    });

    const evidence = calculateCovenantEvidence([first, second], 3, "2026-08-04");

    expect(evidence.promisesKept).toBe(17);
    expect(evidence.covenantDaysKept).toBe(2);
    expect(evidence.currentStreak).toBe(2);
    expect(evidence.bestStreak).toBe(2);
    expect(evidence.workouts).toBe(3);
    expect(evidence.miles).toBeCloseTo(7.2);
    expect(evidence.actsOfService).toBe(2);
    expect(evidence.peopleEncouraged).toBe(2);
    expect(evidence.journalEntries).toBe(1);
    expect(evidence.scriptureMemorized).toBe(1);
  });

  it("calculates the current day without overflowing the 75-day challenge", () => {
    expect(getCovenantDayProgress({ started_on: "2026-08-01", duration_days: 75 }, "2026-08-04")).toMatchObject({
      dayNumber: 4,
      daysRemaining: 71,
      isPastEnd: false,
    });
    expect(getCovenantDayProgress({ started_on: "2026-01-01", duration_days: 75 }, "2026-08-04")).toMatchObject({
      dayNumber: 75,
      daysRemaining: 0,
      isPastEnd: true,
    });
  });
});
