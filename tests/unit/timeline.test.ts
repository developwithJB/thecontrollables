import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateDailyCharge,
  getTimelineNextMove,
  type TimelineEvent,
} from "@/lib/timeline";
import {
  appendTimelineEmailRecap,
  getSafeTimelineMomentTitle,
  renderTimelineEmailRecapHtml,
  renderTimelineEmailRecapText,
  type TimelineEmailRecap,
} from "../../supabase/functions/_shared/timeline-recap";

const event = (
  id: string,
  controllable: "awareness" | "perspective" | "habit" | "wellness" | "environment",
  delta: number,
  scoringStatus: TimelineEvent["scoringStatus"] = "scored",
): TimelineEvent => ({
  id,
  occurredAt: `2026-07-18T${id === "workout" ? "12" : "18"}:00:00.000Z`,
  recordedAt: "2026-07-18T18:00:00.000Z",
  localDate: "2026-07-18",
  timezone: "America/Chicago",
  sourceType: id === "workout" ? "wearable" : "meal",
  eventType: id === "workout" ? "workout" : "meal_logged",
  title: id,
  scoringStatus,
  confidence: 1,
  visibility: "private",
  privateMetadata: {},
  impacts: delta === 0 ? [] : [{
    id: `${id}-impact`,
    controllable,
    delta,
    reasonCode: "test",
    explanation: "Test impact",
    ruleVersion: "v1",
    confidence: 1,
    userOverridden: false,
  }],
});

const recap: TimelineEmailRecap = {
  date: "2026-07-18",
  overallScore: 54,
  netImpact: 4,
  eventCount: 2,
  categoryScores: { awareness: 50, perspective: 50, habit: 52, wellness: 52, environment: 50 },
  moments: [{
    eventType: "workout",
    occurredAt: "2026-07-18T12:00:00.000Z",
    netImpact: 4,
    impacts: [
      { controllable: "habit", delta: 2 },
      { controllable: "wellness", delta: 2 },
    ],
  }],
  nextMove: "Name what is true before the day speeds up.",
  timelineUrl: "https://thedashboard.agbcoaching.com/timeline",
};

describe("Daily Controllables timeline", () => {
  it("calculates Daily Charge independently from permanent XP", () => {
    const snapshot = calculateDailyCharge([
      event("workout", "habit", 2),
      event("sleep", "wellness", 3),
    ], "2026-07-18");

    expect(snapshot).toMatchObject({ overallScore: 55, netImpact: 5, eventCount: 2 });
    expect(snapshot.categoryScores.habit).toBe(52);
    expect(snapshot.categoryScores.wellness).toBe(53);
  });

  it("does not score neutral, pending, or excluded moments", () => {
    const snapshot = calculateDailyCharge([
      event("meal", "wellness", -2, "needs_confirmation"),
      event("excluded", "habit", 5, "excluded"),
    ], "2026-07-18");

    expect(snapshot).toMatchObject({ overallScore: 50, netImpact: 0, eventCount: 0 });
  });

  it("caps negative daily impact without subtracting identity progress", () => {
    const events = Array.from({ length: 20 }, (_, index) => event(`meal-${index}`, "wellness", -3));
    const snapshot = calculateDailyCharge(events, "2026-07-18");

    expect(snapshot.overallScore).toBe(30);
    expect(snapshot.categoryScores.wellness).toBe(40);
  });

  it("recommends an honest read before another scored action", () => {
    const pendingMeal = event("meal", "wellness", 0, "needs_confirmation");
    const snapshot = calculateDailyCharge([pendingMeal], "2026-07-18");

    expect(getTimelineNextMove(snapshot, [pendingMeal]).title).toContain("honest read");
  });

  it("uses safe generic titles in email instead of private event text", () => {
    expect(getSafeTimelineMomentTitle("promise_kept")).toBe("Promise kept");
    expect(getSafeTimelineMomentTitle("unknown-private-source")).toBe("Moment recorded");
    expect(renderTimelineEmailRecapText(recap)).toContain("Workout completed: +2 Habit | +2 Wellness");
    expect(renderTimelineEmailRecapHtml(recap)).not.toMatch(/promise_text|meal description|private_metadata/i);
  });

  it("appends the recap to both HTML and plain text email bodies", () => {
    const result = appendTimelineEmailRecap("<div>Today</div>", "Today", recap);

    expect(result.html).toContain("Yesterday on your Dashboard");
    expect(result.text).toContain("YESTERDAY ON YOUR DASHBOARD");
    expect(result.text).toContain("See the full timeline");
  });

  it("defines private RLS, source adapters, and no automatic meal penalty", () => {
    const migration = readFileSync(
      "supabase/migrations/20260719090000_daily_controllables_timeline.sql",
      "utf8",
    );

    expect(migration).toContain("ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Users can read their own timeline events");
    expect(migration).toContain("sync_whoop_workout_to_timeline");
    expect(migration).toContain("sync_whoop_recovery_to_timeline");
    expect(migration).toContain("sync_dated_goal_log_to_timeline");
    expect(migration).toContain("'meal_logged'");
    expect(migration).toContain("'needs_confirmation'");
    expect(migration).not.toMatch(/app_events/);
    expect(migration).not.toMatch(/mcdonald/i);
  });
});
