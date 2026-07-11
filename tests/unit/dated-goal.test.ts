import { describe, expect, it } from "vitest";
import {
  CHICAGO_MARATHON_WEEKS,
  buildDatedGoalEmailPayload,
  getChicagoDayPrescription,
  getChicagoGoalWeek,
  getGoalAdjustment,
  getGoalCountdownDays,
  getGoalDriftSignal,
  getGoalNutritionTarget,
  getWeeklyGoalScore,
  type GoalDailyLog,
} from "@/lib/datedGoal";

describe("Chicago dated goal operating system", () => {
  it("locks the 13-week progression and race date", () => {
    expect(CHICAGO_MARATHON_WEEKS).toHaveLength(13);
    expect(CHICAGO_MARATHON_WEEKS[0]).toMatchObject({
      startDate: "2026-07-13",
      mileageLabel: "18-21 mi",
      longRunLabel: "9 mi",
    });
    expect(CHICAGO_MARATHON_WEEKS[12]).toMatchObject({
      startDate: "2026-10-05",
      longRunLabel: "26.2 mi",
    });
    expect(getGoalCountdownDays("2026-07-10")).toBe(93);
  });

  it("keeps the pre-build weekend as setup instead of catch-up mileage", () => {
    const saturday = getChicagoDayPrescription("2026-07-11");

    expect(getChicagoGoalWeek("2026-07-11")).toBeNull();
    expect(saturday.sessionType).toBe("setup");
    expect(saturday.distanceLabel).toBe("No catch-up mileage");
  });

  it("returns the correct weekly sessions and key long runs", () => {
    const monday = getChicagoDayPrescription("2026-07-13");
    const firstLongRun = getChicagoDayPrescription("2026-07-18");
    const race = getChicagoDayPrescription("2026-10-11");

    expect(monday).toMatchObject({ sessionType: "strength", distanceLabel: "No running" });
    expect(firstLongRun).toMatchObject({ sessionType: "long", distanceLabel: "9 mi", isKeySession: true });
    expect(race).toMatchObject({ sessionType: "race", distanceLabel: "26.2 mi" });
    expect(race.details).toContain("Miles 1-3: 9:15-9:20");
  });

  it("applies WHOOP recovery rules without adding training", () => {
    const quality = getChicagoDayPrescription("2026-07-14");

    expect(getGoalAdjustment(quality, { recovery: 82, sleepMinutes: 500 })).toMatchObject({ mode: "follow" });
    expect(getGoalAdjustment(quality, { recovery: 52, sleepMinutes: 390 })).toMatchObject({ mode: "reduce" });
    expect(getGoalAdjustment(quality, { recovery: 28, sleepMinutes: 480 })).toMatchObject({ mode: "recover" });
    expect(getGoalAdjustment(quality, { recovery: 70, sleepMinutes: 480, recentRecoveries: [30, 55, 29] })).toMatchObject({ mode: "recover" });
    expect(getGoalAdjustment(quality, { recovery: 90, sleepMinutes: 500, painAffectingStride: true })).toMatchObject({ mode: "stop" });
  });

  it("scales fuel targets to the work without an aggressive cut", () => {
    const quality = getGoalNutritionTarget(getChicagoDayPrescription("2026-07-14"));
    const rest = getGoalNutritionTarget(getChicagoDayPrescription("2026-07-17"));

    expect(quality).toMatchObject({ protein: "150-170g", carbohydrates: "425-550g" });
    expect(rest).toMatchObject({ protein: "150-170g", carbohydrates: "250-325g" });
  });

  it("detects two missed planned runs and rewards recovery instead of catch-up", () => {
    const logs: GoalDailyLog[] = [
      { logDate: "2026-07-14", sessionType: "quality", status: "skipped", actualMiles: 0, strengthCompleted: false, fuelingCompleted: null, painAffectingStride: false },
      { logDate: "2026-07-15", sessionType: "easy", status: "skipped", actualMiles: 0, strengthCompleted: false, fuelingCompleted: null, painAffectingStride: false },
    ];
    const drift = getGoalDriftSignal({ currentDate: "2026-07-15", logs });

    expect(drift.level).toBe("drifting");
    expect(drift.reasons).toContain("Two planned runs are unconfirmed in a row");
    expect(drift.message).toContain("Do not make up missed work");
  });

  it("detects silent drift when prior planned runs were never logged", () => {
    const drift = getGoalDriftSignal({ currentDate: "2026-07-16", logs: [] });

    expect(drift.level).toBe("drifting");
    expect(drift.reasons).toContain("Two planned runs are unconfirmed in a row");
  });

  it("calculates the exact six-part Sunday scorecard", () => {
    const week = CHICAGO_MARATHON_WEEKS[0];
    const logs: GoalDailyLog[] = [
      { logDate: "2026-07-13", sessionType: "strength", status: "completed", actualMiles: 0, strengthCompleted: true, fuelingCompleted: null, painAffectingStride: false },
      { logDate: "2026-07-14", sessionType: "quality", status: "completed", actualMiles: 4, strengthCompleted: false, fuelingCompleted: true, painAffectingStride: false },
      { logDate: "2026-07-15", sessionType: "easy", status: "completed", actualMiles: 4, strengthCompleted: false, fuelingCompleted: null, painAffectingStride: false },
      { logDate: "2026-07-16", sessionType: "easy", status: "completed", actualMiles: 4, strengthCompleted: true, fuelingCompleted: null, painAffectingStride: false },
      { logDate: "2026-07-18", sessionType: "long", status: "completed", actualMiles: 9, strengthCompleted: false, fuelingCompleted: true, painAffectingStride: false },
    ];
    const score = getWeeklyGoalScore({ week, logs, sleepPerformances: [87, 90, 85, 88, 86] });

    expect(score).toMatchObject({
      completedRuns: 4,
      longRunCompleted: true,
      strengthSessions: 2,
      longRunFueled: true,
      painFree: true,
      wins: 6,
    });
  });

  it("builds a concise daily email from the same plan as the app", () => {
    const payload = buildDatedGoalEmailPayload({
      displayName: "JB",
      currentDate: "2026-07-14",
      appUrl: "https://thedashboard.agbcoaching.com/goal",
      health: { recovery: 71, sleepMinutes: 490, recentRecoveries: [71, 62, 80] },
      drift: { level: "on_track", label: "On plan", message: "Keep the next appointment.", reasons: [] },
      weekMilesCompleted: 0,
    });

    expect(payload.subject).toBe("89 days to Chicago: Quality run");
    expect(payload.text).toContain("Week 1/13 | 18-21 mi | Long run 9 mi");
    expect(payload.text).toContain("TODAY: Quality run");
    expect(payload.text).toContain("8+ hours in bed");
    expect(payload.html).toContain("Open today's plan");
    expect(payload.text).not.toMatch(/journal|calendar|money|private reflection|exact location/i);
  });
});
