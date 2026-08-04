export const COVENANT_DURATION_DAYS = 75;

export const COVENANT_PROMISE_KEYS = [
  "jesus_first",
  "bible_read",
  "alcohol_free",
  "workout",
  "nutrition",
  "water",
  "service",
] as const;

export type CovenantPromiseKey = (typeof COVENANT_PROMISE_KEYS)[number];

export interface CovenantPromiseDefinition {
  key: CovenantPromiseKey;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  opportunityLabel: string;
}

export const COVENANT_PROMISE_DEFINITIONS: CovenantPromiseDefinition[] = [
  {
    key: "jesus_first",
    emoji: "🙏",
    label: "Jesus First",
    shortLabel: "Jesus First",
    description: "Begin with prayer before the noise gets a vote.",
    opportunityLabel: "+1 Jesus First morning",
  },
  {
    key: "bible_read",
    emoji: "📖",
    label: "Bible Read",
    shortLabel: "Bible Reading",
    description: "Read Scripture slowly enough to carry one truth with you.",
    opportunityLabel: "+1 Bible reading",
  },
  {
    key: "alcohol_free",
    emoji: "🚫",
    label: "Alcohol Free",
    shortLabel: "Alcohol Free",
    description: "Keep the day clear and alcohol free.",
    opportunityLabel: "+1 alcohol-free day",
  },
  {
    key: "workout",
    emoji: "💪",
    label: "Train the Body",
    shortLabel: "Workout",
    description: "Complete the workout you committed to before comfort negotiates it away.",
    opportunityLabel: "+1 workout",
  },
  {
    key: "nutrition",
    emoji: "🥗",
    label: "Honor the Plan",
    shortLabel: "Nutrition",
    description: "Eat in a way that honors the body and the plan you chose.",
    opportunityLabel: "+1 disciplined nutrition day",
  },
  {
    key: "water",
    emoji: "💧",
    label: "Water Goal",
    shortLabel: "Water Goal",
    description: "Finish the hydration goal you set for the challenge.",
    opportunityLabel: "+1 water goal",
  },
  {
    key: "service",
    emoji: "🤝",
    label: "Serve Someone",
    shortLabel: "Act of Service",
    description: "Move attention outward through one concrete act of service or encouragement.",
    opportunityLabel: "+1 act of service",
  },
];

export type GraceEvidenceCategory =
  | "answered_prayer"
  | "journal_moment"
  | "shaping_scripture"
  | "milestone"
  | "testimony"
  | "person_impacted";

export const GRACE_EVIDENCE_CATEGORIES: Array<{
  key: GraceEvidenceCategory;
  emoji: string;
  label: string;
  singular: string;
}> = [
  { key: "answered_prayer", emoji: "🙏", label: "Prayers Answered", singular: "Answered prayer" },
  { key: "journal_moment", emoji: "✍️", label: "Journal Moments", singular: "Journal moment" },
  { key: "shaping_scripture", emoji: "📖", label: "Scriptures That Shaped You", singular: "Shaping Scripture" },
  { key: "milestone", emoji: "🪨", label: "Milestones", singular: "Milestone" },
  { key: "testimony", emoji: "✨", label: "Testimonies", singular: "Testimony" },
  { key: "person_impacted", emoji: "🤲", label: "People Impacted", singular: "Person impacted" },
];

export interface CovenantChallengeRecord {
  id: string;
  user_id: string;
  title: string;
  mission: string | null;
  duration_days: number;
  started_on: string;
  ends_on: string;
  status: "active" | "completed" | "paused" | "ended";
  rules: CovenantPromiseKey[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CovenantDailyCheckinRecord {
  id: string;
  challenge_id: string;
  user_id: string;
  checkin_date: string;
  jesus_first: boolean;
  bible_read: boolean;
  alcohol_free: boolean;
  workout_count: number;
  miles: number;
  nutrition_kept: boolean;
  water_goal: boolean;
  service_count: number;
  people_encouraged: number;
  journal_entry: boolean;
  scripture_memorized_count: number;
  reflection: string | null;
  day_complete: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraceEvidenceRecord {
  id: string;
  user_id: string;
  challenge_id: string | null;
  category: GraceEvidenceCategory;
  title: string;
  story: string | null;
  scripture_reference: string | null;
  occurred_on: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CovenantEvidenceSummary {
  promisesKept: number;
  covenantDaysKept: number;
  currentStreak: number;
  bestStreak: number;
  jesusFirst: number;
  bibleRead: number;
  alcoholFree: number;
  workouts: number;
  miles: number;
  actsOfService: number;
  peopleEncouraged: number;
  journalEntries: number;
  scriptureMemorized: number;
}

export interface CovenantDayProgress {
  dayNumber: number;
  daysRemaining: number;
  progressPercent: number;
  isBeforeStart: boolean;
  isPastEnd: boolean;
}

export const createEmptyCovenantCheckin = (
  challengeId: string,
  userId: string,
  date: string,
): CovenantDailyCheckinRecord => ({
  id: "",
  challenge_id: challengeId,
  user_id: userId,
  checkin_date: date,
  jesus_first: false,
  bible_read: false,
  alcohol_free: false,
  workout_count: 0,
  miles: 0,
  nutrition_kept: false,
  water_goal: false,
  service_count: 0,
  people_encouraged: 0,
  journal_entry: false,
  scripture_memorized_count: 0,
  reflection: null,
  day_complete: false,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const getTodayDateKey = (): string => new Date().toLocaleDateString("sv-SE");

const parseDateKey = (value: string): Date => new Date(`${value}T12:00:00Z`);

const shiftDateKey = (value: string, amount: number): string => {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const dateDifference = (later: string, earlier: string): number => {
  const milliseconds = parseDateKey(later).getTime() - parseDateKey(earlier).getTime();
  return Math.floor(milliseconds / 86_400_000);
};

export const getCovenantDayProgress = (
  challenge: Pick<CovenantChallengeRecord, "started_on" | "duration_days">,
  date = getTodayDateKey(),
): CovenantDayProgress => {
  const elapsed = dateDifference(date, challenge.started_on);
  const isBeforeStart = elapsed < 0;
  const rawDay = elapsed + 1;
  const dayNumber = Math.min(Math.max(rawDay, 1), challenge.duration_days);
  const isPastEnd = rawDay > challenge.duration_days;

  return {
    dayNumber,
    daysRemaining: Math.max(0, challenge.duration_days - Math.max(rawDay, 1)),
    progressPercent: Math.min(100, Math.max(0, (Math.max(rawDay, 0) / challenge.duration_days) * 100)),
    isBeforeStart,
    isPastEnd,
  };
};

export const normalizeCovenantRules = (value: unknown): CovenantPromiseKey[] => {
  if (!Array.isArray(value)) return [...COVENANT_PROMISE_KEYS];
  const normalized = value.filter((item): item is CovenantPromiseKey =>
    COVENANT_PROMISE_KEYS.includes(item as CovenantPromiseKey),
  );
  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...COVENANT_PROMISE_KEYS];
};

export const isCovenantPromiseComplete = (
  checkin: CovenantDailyCheckinRecord,
  key: CovenantPromiseKey,
): boolean => {
  switch (key) {
    case "jesus_first":
      return checkin.jesus_first;
    case "bible_read":
      return checkin.bible_read;
    case "alcohol_free":
      return checkin.alcohol_free;
    case "workout":
      return checkin.workout_count > 0;
    case "nutrition":
      return checkin.nutrition_kept;
    case "water":
      return checkin.water_goal;
    case "service":
      return checkin.service_count > 0;
  }
};

export const isCovenantDayComplete = (
  checkin: CovenantDailyCheckinRecord,
  rules: CovenantPromiseKey[],
): boolean => normalizeCovenantRules(rules).every((key) => isCovenantPromiseComplete(checkin, key));

const countCompletedPromises = (checkin: CovenantDailyCheckinRecord): number => {
  return COVENANT_PROMISE_KEYS.reduce(
    (count, key) => count + (isCovenantPromiseComplete(checkin, key) ? 1 : 0),
    0,
  );
};

const calculateStreaks = (
  checkins: CovenantDailyCheckinRecord[],
  today: string,
): { currentStreak: number; bestStreak: number } => {
  const completeDates = Array.from(
    new Set(checkins.filter((entry) => entry.day_complete).map((entry) => entry.checkin_date)),
  ).sort();
  const completeSet = new Set(completeDates);

  let currentCursor = completeSet.has(today) ? today : shiftDateKey(today, -1);
  let currentStreak = 0;
  while (completeSet.has(currentCursor)) {
    currentStreak += 1;
    currentCursor = shiftDateKey(currentCursor, -1);
  }

  let bestStreak = 0;
  let running = 0;
  let previous: string | null = null;
  for (const date of completeDates) {
    running = previous && dateDifference(date, previous) === 1 ? running + 1 : 1;
    bestStreak = Math.max(bestStreak, running);
    previous = date;
  }

  return { currentStreak, bestStreak };
};

export const calculateCovenantEvidence = (
  checkins: CovenantDailyCheckinRecord[],
  keptIntegrityPromises = 0,
  today = getTodayDateKey(),
): CovenantEvidenceSummary => {
  const streaks = calculateStreaks(checkins, today);

  return checkins.reduce<CovenantEvidenceSummary>(
    (summary, entry) => ({
      ...summary,
      promisesKept: summary.promisesKept + countCompletedPromises(entry),
      covenantDaysKept: summary.covenantDaysKept + (entry.day_complete ? 1 : 0),
      jesusFirst: summary.jesusFirst + (entry.jesus_first ? 1 : 0),
      bibleRead: summary.bibleRead + (entry.bible_read ? 1 : 0),
      alcoholFree: summary.alcoholFree + (entry.alcohol_free ? 1 : 0),
      workouts: summary.workouts + Math.max(0, entry.workout_count),
      miles: summary.miles + Math.max(0, entry.miles),
      actsOfService: summary.actsOfService + Math.max(0, entry.service_count),
      peopleEncouraged: summary.peopleEncouraged + Math.max(0, entry.people_encouraged),
      journalEntries: summary.journalEntries + (entry.journal_entry ? 1 : 0),
      scriptureMemorized: summary.scriptureMemorized + Math.max(0, entry.scripture_memorized_count),
    }),
    {
      promisesKept: Math.max(0, keptIntegrityPromises),
      covenantDaysKept: 0,
      currentStreak: streaks.currentStreak,
      bestStreak: streaks.bestStreak,
      jesusFirst: 0,
      bibleRead: 0,
      alcoholFree: 0,
      workouts: 0,
      miles: 0,
      actsOfService: 0,
      peopleEncouraged: 0,
      journalEntries: 0,
      scriptureMemorized: 0,
    },
  );
};

export const getCovenantPromiseDefinition = (key: CovenantPromiseKey): CovenantPromiseDefinition =>
  COVENANT_PROMISE_DEFINITIONS.find((definition) => definition.key === key) ??
  COVENANT_PROMISE_DEFINITIONS[0];
