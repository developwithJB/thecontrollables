export const TIMELINE_RULE_VERSION = "v1";
export const DAILY_CHARGE_BASELINE = 50;

export const TIMELINE_CONTROLLABLES = [
  "awareness",
  "perspective",
  "habit",
  "wellness",
  "environment",
] as const;

export type TimelineControllable = (typeof TIMELINE_CONTROLLABLES)[number];
export type TimelineScoringStatus = "scored" | "neutral" | "needs_confirmation" | "excluded";
export type TimelineVisibility = "private" | "anonymous" | "public";
export type TimelineAssessment = "supported" | "neutral" | "worked_against_plan";

export interface TimelineImpact {
  id: string;
  controllable: TimelineControllable;
  delta: number;
  reasonCode: string;
  explanation: string;
  ruleVersion: string;
  confidence: number;
  userOverridden: boolean;
}

export interface TimelineEvent {
  id: string;
  occurredAt: string;
  recordedAt: string;
  localDate: string;
  timezone: string;
  sourceType: string;
  eventType: string;
  title: string;
  scoringStatus: TimelineScoringStatus;
  confidence: number;
  visibility: TimelineVisibility;
  privateMetadata: Record<string, unknown>;
  impacts: TimelineImpact[];
}

export interface TimelineCategoryScores {
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
}

export interface DailyChargeSnapshot {
  chargeDate: string;
  overallScore: number;
  netImpact: number;
  eventCount: number;
  categoryScores: TimelineCategoryScores;
  ruleVersion: string;
  calculatedAt: string;
}

export const CONTROLLABLE_LABELS: Record<TimelineControllable, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

export const CONTROLLABLE_SYMBOLS: Record<TimelineControllable, string> = {
  awareness: "OWL",
  perspective: "TURTLE",
  habit: "SHARK",
  wellness: "SAT",
  environment: "ROCKET",
};

export const EMPTY_CATEGORY_SCORES: TimelineCategoryScores = {
  awareness: DAILY_CHARGE_BASELINE,
  perspective: DAILY_CHARGE_BASELINE,
  habit: DAILY_CHARGE_BASELINE,
  wellness: DAILY_CHARGE_BASELINE,
  environment: DAILY_CHARGE_BASELINE,
};

export const MANUAL_MOMENT_TYPES = [
  { value: "workout", label: "Workout", controllable: "wellness" },
  { value: "promise_kept", label: "Kept promise", controllable: "habit" },
  { value: "recovery", label: "Recovery", controllable: "wellness" },
  { value: "environment_reset", label: "Environment reset", controllable: "environment" },
  { value: "reflection", label: "Reflection", controllable: "awareness" },
  { value: "meal", label: "Meal", controllable: "wellness" },
  { value: "manual_note", label: "Other moment", controllable: "awareness" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  controllable: TimelineControllable;
}>;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const calculateDailyCharge = (
  events: TimelineEvent[],
  chargeDate: string,
): DailyChargeSnapshot => {
  const categoryDeltas: Record<TimelineControllable, number> = {
    awareness: 0,
    perspective: 0,
    habit: 0,
    wellness: 0,
    environment: 0,
  };
  let netImpact = 0;
  let eventCount = 0;

  for (const event of events) {
    if (event.scoringStatus !== "scored") continue;
    eventCount += 1;
    for (const impact of event.impacts) {
      const delta = clamp(impact.delta, -3, 5);
      categoryDeltas[impact.controllable] += delta;
      netImpact += delta;
    }
  }

  const categoryScores = Object.fromEntries(
    TIMELINE_CONTROLLABLES.map((controllable) => [
      controllable,
      clamp(DAILY_CHARGE_BASELINE + clamp(categoryDeltas[controllable], -10, 20), 0, 100),
    ]),
  ) as unknown as TimelineCategoryScores;

  return {
    chargeDate,
    overallScore: clamp(DAILY_CHARGE_BASELINE + clamp(netImpact, -20, 50), 0, 100),
    netImpact,
    eventCount,
    categoryScores,
    ruleVersion: TIMELINE_RULE_VERSION,
    calculatedAt: new Date().toISOString(),
  };
};

export const normalizeCategoryScores = (value: unknown): TimelineCategoryScores => {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    TIMELINE_CONTROLLABLES.map((controllable) => [
      controllable,
      clamp(Number(source[controllable] ?? DAILY_CHARGE_BASELINE), 0, 100),
    ]),
  ) as unknown as TimelineCategoryScores;
};

export const getEventNetImpact = (event: TimelineEvent): number => {
  if (event.scoringStatus !== "scored") return 0;
  return event.impacts.reduce((sum, impact) => sum + impact.delta, 0);
};

export const getTimelineNextMove = (
  snapshot: DailyChargeSnapshot,
  events: TimelineEvent[],
): { controllable: TimelineControllable; title: string } => {
  const pending = events.find((event) => event.scoringStatus === "needs_confirmation");
  if (pending) {
    return {
      controllable: pending.eventType.includes("meal") ? "wellness" : "habit",
      title: "Give one unscored moment an honest read.",
    };
  }

  const lowest = TIMELINE_CONTROLLABLES.reduce((current, candidate) =>
    snapshot.categoryScores[candidate] < snapshot.categoryScores[current] ? candidate : current,
  );

  const moves: Record<TimelineControllable, string> = {
    awareness: "Pause and name what is true right now.",
    perspective: "Reframe one story before it hardens.",
    habit: "Keep one small promise before the day ends.",
    wellness: "Protect food, water, movement, or recovery next.",
    environment: "Remove one point of friction around you.",
  };

  return { controllable: lowest, title: moves[lowest] };
};

export const getTimelineEventLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    action_completed: "Rep complete",
    awareness_checkin: "Awareness check-in",
    daily_practice: "Daily Charge",
    goal_training: "Goal training",
    meal: "Meal",
    meal_logged: "Meal logged",
    mission_completed: "Mission complete",
    planner_completed: "Plan completed",
    planner_skipped: "Plan changed",
    promise_kept: "Promise kept",
    promise_made: "Promise set",
    promise_unkept: "Promise needs a read",
    recovery: "Recovery",
    recovery_recorded: "Recovery recorded",
    reflection: "Reflection",
    sleep_recorded: "Sleep recorded",
    workout: "Workout",
  };
  return labels[eventType] ?? "Recorded moment";
};

export const isTimelineAssessmentEvent = (event: TimelineEvent): boolean =>
  ["meal", "meal_logged", "planner_skipped", "promise_unkept", "manual_note"].includes(event.eventType);

export const getSafeTimelineEmailTitle = (eventType: string): string =>
  getTimelineEventLabel(eventType);
