import {
  MANUAL_MOMENT_TYPES,
  type TimelineAssessment,
  type TimelineControllable,
  type TimelineEvent,
} from "@/lib/timeline";

const DEV_TIMELINE_KEY = "dev_mock_timeline_events_v1";

const isoAt = (localDate: string, time: string) => new Date(`${localDate}T${time}:00`).toISOString();

const impact = (
  id: string,
  controllable: TimelineControllable,
  delta: number,
  explanation: string,
) => ({
  id,
  controllable,
  delta,
  reasonCode: "dev_mock",
  explanation,
  ruleVersion: "v1",
  confidence: 1,
  userOverridden: false,
});

const baseEvents = (localDate: string): TimelineEvent[] => [
  {
    id: `dev-sleep-${localDate}`,
    occurredAt: isoAt(localDate, "06:42"),
    recordedAt: isoAt(localDate, "06:45"),
    localDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    sourceType: "wearable",
    eventType: "sleep_recorded",
    title: "Sleep recorded",
    scoringStatus: "scored",
    confidence: 0.98,
    visibility: "private",
    privateMetadata: { provider: "dev_mock" },
    impacts: [impact(`dev-sleep-impact-${localDate}`, "wellness", 3, "Your sleep met the recovery target.")],
  },
  {
    id: `dev-workout-${localDate}`,
    occurredAt: isoAt(localDate, "07:14"),
    recordedAt: isoAt(localDate, "08:01"),
    localDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    sourceType: "wearable",
    eventType: "workout",
    title: "Morning run",
    scoringStatus: "scored",
    confidence: 0.98,
    visibility: "private",
    privateMetadata: { provider: "dev_mock" },
    impacts: [
      impact(`dev-workout-habit-${localDate}`, "habit", 2, "You showed up for a physical training rep."),
      impact(`dev-workout-wellness-${localDate}`, "wellness", 2, "Movement supported your physical capacity."),
    ],
  },
  {
    id: `dev-meal-${localDate}`,
    occurredAt: isoAt(localDate, "12:20"),
    recordedAt: isoAt(localDate, "12:20"),
    localDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    sourceType: "meal",
    eventType: "meal_logged",
    title: "Lunch logged",
    scoringStatus: "needs_confirmation",
    confidence: 1,
    visibility: "private",
    privateMetadata: {},
    impacts: [],
  },
  {
    id: `dev-promise-${localDate}`,
    occurredAt: isoAt(localDate, "20:15"),
    recordedAt: isoAt(localDate, "20:15"),
    localDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    sourceType: "promise",
    eventType: "promise_kept",
    title: "Promise kept",
    scoringStatus: "scored",
    confidence: 1,
    visibility: "private",
    privateMetadata: {},
    impacts: [impact(`dev-promise-impact-${localDate}`, "habit", 3, "You followed through on a promise you chose.")],
  },
];

const readStored = (): TimelineEvent[] => {
  try {
    const raw = localStorage.getItem(DEV_TIMELINE_KEY);
    return raw ? JSON.parse(raw) as TimelineEvent[] : [];
  } catch {
    return [];
  }
};

const writeStored = (events: TimelineEvent[]) => {
  try {
    localStorage.setItem(DEV_TIMELINE_KEY, JSON.stringify(events));
  } catch {
    // Mock QA storage is best effort.
  }
};

export const getDevTimelineEvents = (localDate: string): TimelineEvent[] => {
  const stored = readStored();
  if (!stored.some((event) => event.id === `dev-sleep-${localDate}`)) {
    stored.push(...baseEvents(localDate));
    writeStored(stored);
  }
  const events = stored.filter((event) => event.localDate === localDate);
  return events.sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
};

export const createDevTimelineMoment = (input: {
  title: string;
  eventType: string;
  targetControllable: TimelineControllable;
  occurredAt: string;
  localDate: string;
  timezone: string;
}): string => {
  const id = crypto.randomUUID();
  const option = MANUAL_MOMENT_TYPES.find((item) => item.value === input.eventType);
  const delta = input.eventType === "promise_kept" ? 3
    : ["workout", "recovery", "environment_reset"].includes(input.eventType) ? 2
      : input.eventType === "reflection" ? 1 : 0;
  const stored = readStored();
  stored.push({
    id,
    occurredAt: input.occurredAt,
    recordedAt: new Date().toISOString(),
    localDate: input.localDate,
    timezone: input.timezone,
    sourceType: "manual",
    eventType: input.eventType,
    title: input.title,
    scoringStatus: delta ? "scored" : "needs_confirmation",
    confidence: 1,
    visibility: "private",
    privateMetadata: {},
    impacts: delta ? [impact(`${id}-impact`, input.targetControllable, delta, `${option?.label ?? "This moment"} was recorded as a real rep.`)] : [],
  });
  writeStored(stored);
  return id;
};

export const assessDevTimelineEvent = (eventId: string, assessment: TimelineAssessment) => {
  const stored = readStored();
  const event = stored.find((item) => item.id === eventId);
  if (!event) return;
  const delta = assessment === "supported" ? 1 : assessment === "worked_against_plan" ? -2 : 0;
  event.scoringStatus = assessment === "neutral" ? "neutral" : "scored";
  event.impacts = delta ? [impact(`${event.id}-assessment`, event.eventType.includes("meal") ? "wellness" : "habit", delta, assessment === "supported" ? "You confirmed this supported the plan." : "You confirmed this worked against the plan you chose.")] : [];
  writeStored(stored);
};

export const setDevTimelineEventIncluded = (eventId: string, included: boolean) => {
  const stored = readStored();
  const event = stored.find((item) => item.id === eventId);
  if (!event) return;
  event.scoringStatus = included ? (event.impacts.length ? "scored" : "neutral") : "excluded";
  writeStored(stored);
};

export const deleteDevTimelineMoment = (eventId: string) => {
  writeStored(readStored().filter((event) => event.id !== eventId));
};
