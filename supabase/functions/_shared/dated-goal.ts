export type GoalSessionType =
  | "setup"
  | "rest"
  | "strength"
  | "quality"
  | "easy"
  | "long"
  | "recovery"
  | "race";

export type GoalLogStatus = "completed" | "modified" | "skipped";

export interface DatedGoalWeek {
  week: number;
  startDate: string;
  mileageLabel: string;
  mileageMin: number;
  mileageMax: number;
  longRunLabel: string;
  keyFocus: string;
  qualityWorkout: string;
  longRunWorkout: string;
}

export interface GoalDayPrescription {
  date: string;
  dayName: string;
  sessionType: GoalSessionType;
  title: string;
  distanceLabel: string;
  instruction: string;
  details: string[];
  strengthDetails: string[];
  fuelingCue: string | null;
  sleepTarget: string;
  isPlannedRun: boolean;
  isKeySession: boolean;
}

export interface GoalHealthSignals {
  recovery: number | null;
  sleepMinutes: number | null;
  recentRecoveries?: Array<number | null>;
  painAffectingStride?: boolean;
  legsFeelDead?: boolean;
}

export interface GoalAdjustment {
  mode: "follow" | "check" | "reduce" | "recover" | "stop";
  label: string;
  message: string;
}

export interface GoalNutritionTarget {
  protein: string;
  carbohydrates: string;
  timing: string;
}

export interface GoalDailyLog {
  logDate: string;
  sessionType: GoalSessionType;
  status: GoalLogStatus;
  actualMiles: number | null;
  strengthCompleted: boolean;
  fuelingCompleted: boolean | null;
  painAffectingStride: boolean;
}

export interface GoalDriftSignal {
  level: "on_track" | "watch" | "drifting";
  label: string;
  message: string;
  reasons: string[];
}

export interface DatedGoalRecord {
  id: string;
  user_id: string;
  plan_id: string;
  title: string;
  event_name: string;
  event_date: string;
  start_date: string;
  timezone: string;
  target_result: string;
  status: "active" | "paused" | "completed" | "archived";
}

export interface DatedGoalEmailPayload {
  subject: string;
  previewText: string;
  text: string;
  html: string;
}

export const CHICAGO_MARATHON_PLAN_ID = "chicago-marathon-2026-sub-4";
export const CHICAGO_MARATHON_EVENT_DATE = "2026-10-11";
export const CHICAGO_MARATHON_START_DATE = "2026-07-13";
export const MARATHON_PACE_LABEL = "9:05-9:15/mi";

export const CHICAGO_MARATHON_WEEKS: DatedGoalWeek[] = [
  {
    week: 1,
    startDate: "2026-07-13",
    mileageLabel: "18-21 mi",
    mileageMin: 18,
    mileageMax: 21,
    longRunLabel: "9 mi",
    keyFocus: "Establish four runs",
    qualityWorkout: "1 mi easy, 2 mi controlled tempo, 1 mi easy",
    longRunWorkout: "9 easy miles. Finish with the sense that you could keep going.",
  },
  {
    week: 2,
    startDate: "2026-07-20",
    mileageLabel: "22-24 mi",
    mileageMin: 22,
    mileageMax: 24,
    longRunLabel: "10-11 mi",
    keyFocus: "Easy consistency",
    qualityWorkout: "1 mi easy, 3 mi controlled tempo, 1 mi easy",
    longRunWorkout: "10-11 easy miles. Keep the first half deliberately quiet.",
  },
  {
    week: 3,
    startDate: "2026-07-27",
    mileageLabel: "24-27 mi",
    mileageMin: 24,
    mileageMax: 27,
    longRunLabel: "12 mi",
    keyFocus: "Add controlled tempo",
    qualityWorkout: "1 mi easy, 4 mi controlled tempo, 1 mi easy",
    longRunWorkout: "12 easy miles. Begin fueling within the first 25 minutes.",
  },
  {
    week: 4,
    startDate: "2026-08-03",
    mileageLabel: "20-23 mi",
    mileageMin: 20,
    mileageMax: 23,
    longRunLabel: "9-10 mi",
    keyFocus: "Cutback",
    qualityWorkout: "4-5 easy miles. Keep the week restorative.",
    longRunWorkout: "9-10 easy miles. No pace pressure.",
  },
  {
    week: 5,
    startDate: "2026-08-10",
    mileageLabel: "27-30 mi",
    mileageMin: 27,
    mileageMax: 30,
    longRunLabel: "13-14 mi",
    keyFocus: "First marathon-pace finish",
    qualityWorkout: "1 mi easy, 4 mi at marathon effort, 1 mi easy",
    longRunWorkout: "13-14 miles with the final 4 at 9:10-9:20/mi. Finish controlled.",
  },
  {
    week: 6,
    startDate: "2026-08-17",
    mileageLabel: "30-33 mi",
    mileageMin: 30,
    mileageMax: 33,
    longRunLabel: "15 mi",
    keyFocus: "Fueling practice",
    qualityWorkout: "1 mi easy, 5 mi controlled tempo, 1 mi easy",
    longRunWorkout: "15 easy miles while practicing 50-60g carbohydrate per hour.",
  },
  {
    week: 7,
    startDate: "2026-08-24",
    mileageLabel: "24-27 mi",
    mileageMin: 24,
    mileageMax: 27,
    longRunLabel: "12 mi",
    keyFocus: "Cutback",
    qualityWorkout: "1 mi easy, 3 mi controlled tempo, 1 mi easy",
    longRunWorkout: "12 easy miles. Let the adaptation catch up.",
  },
  {
    week: 8,
    startDate: "2026-08-31",
    mileageLabel: "33-36 mi",
    mileageMin: 33,
    mileageMax: 36,
    longRunLabel: "16 mi",
    keyFocus: "Final 4 near marathon pace",
    qualityWorkout: "1 mi easy, 6 mi at marathon effort, 1 mi easy",
    longRunWorkout: "16 miles with the final 4 at 9:05-9:15/mi.",
  },
  {
    week: 9,
    startDate: "2026-09-07",
    mileageLabel: "35-38 mi",
    mileageMin: 35,
    mileageMax: 38,
    longRunLabel: "18 mi",
    keyFocus: "Full race fueling rehearsal",
    qualityWorkout: "1 mi easy, 5 mi controlled tempo, 1 mi easy",
    longRunWorkout: "18 miles with the final 5-6 at 9:05-9:15/mi. Rehearse 60-75g carbohydrate per hour.",
  },
  {
    week: 10,
    startDate: "2026-09-14",
    mileageLabel: "37-41 mi",
    mileageMin: 37,
    mileageMax: 41,
    longRunLabel: "19-20 mi",
    keyFocus: "Peak week",
    qualityWorkout: "1 mi easy, 6 mi at marathon effort, 1 mi easy",
    longRunWorkout: "19-20 miles: 4 easy, 4 at marathon pace, 2 easy, 4 at marathon pace, then easy home.",
  },
  {
    week: 11,
    startDate: "2026-09-21",
    mileageLabel: "30-34 mi",
    mileageMin: 30,
    mileageMax: 34,
    longRunLabel: "14-16 mi",
    keyFocus: "Begin freshening up",
    qualityWorkout: "1 mi easy, 4 mi at marathon effort, 1 mi easy",
    longRunWorkout: "14-16 easy miles. Protect freshness; do not prove fitness.",
  },
  {
    week: 12,
    startDate: "2026-09-28",
    mileageLabel: "20-24 mi",
    mileageMin: 20,
    mileageMax: 24,
    longRunLabel: "10-12 mi",
    keyFocus: "Taper",
    qualityWorkout: "1 mi easy, 3 mi at marathon effort, 1 mi easy",
    longRunWorkout: "10-12 easy miles. Finish wanting more.",
  },
  {
    week: 13,
    startDate: "2026-10-05",
    mileageLabel: "Race week",
    mileageMin: 26.2,
    mileageMax: 26.2,
    longRunLabel: "26.2 mi",
    keyFocus: "Execute",
    qualityWorkout: "Short easy running only. No fitness can be added this week.",
    longRunWorkout: "Chicago Marathon: target 3:58-3:59. First 3 miles at 9:15-9:20/mi.",
  },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDateKey(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

function shiftDateKey(value: string, days: number): string {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDifference(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
}

export function getGoalCountdownDays(currentDate: string, eventDate = CHICAGO_MARATHON_EVENT_DATE): number {
  return Math.max(0, dayDifference(currentDate, eventDate));
}

export function getChicagoGoalWeek(currentDate: string): DatedGoalWeek | null {
  if (currentDate < CHICAGO_MARATHON_START_DATE || currentDate > CHICAGO_MARATHON_EVENT_DATE) return null;

  for (let index = CHICAGO_MARATHON_WEEKS.length - 1; index >= 0; index -= 1) {
    if (currentDate >= CHICAGO_MARATHON_WEEKS[index].startDate) {
      return CHICAGO_MARATHON_WEEKS[index];
    }
  }
  return null;
}

export function getChicagoWeekDates(week: DatedGoalWeek): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDateKey(week.startDate, index));
}

function standardPrescription(date: string, week: DatedGoalWeek, day: number): GoalDayPrescription {
  const base = {
    date,
    dayName: DAY_NAMES[day],
    sleepTarget: day === 1 || day === 5 ? "8.5 hours in bed" : "8+ hours in bed",
  };

  if (day === 1) {
    return {
      ...base,
      sessionType: "strength",
      title: "Recovery + strength",
      distanceLabel: "No running",
      instruction: "Finish feeling better than when you entered.",
      details: ["10 min easy bike or pool walking", "10 min mobility", "Compression boots 20-30 min"],
      strengthDetails: [
        "Trap-bar deadlift 3 x 5",
        "Bulgarian split squat 3 x 6/leg",
        "Seated row 3 x 8",
        "Calf raise 3 x 12 + soleus raise 3 x 15",
        "Pallof press 3 x 10/side",
      ],
      fuelingCue: "Eat normally; prioritize protein and carbohydrates for Tuesday.",
      isPlannedRun: false,
      isKeySession: false,
    };
  }

  if (day === 2) {
    return {
      ...base,
      sessionType: week.week === 13 ? "easy" : "quality",
      title: week.week === 13 ? "Easy activation" : "Quality run",
      distanceLabel: week.week === 13 ? "3 easy mi" : "Tempo / marathon effort",
      instruction: week.qualityWorkout,
      details: ["Effort before pace in heat", "Tempo is 7/10, never a race", `Marathon pace target: ${MARATHON_PACE_LABEL}`],
      strengthDetails: [],
      fuelingCue: "Key session: eat 75-125g carbohydrate 2-3 hours before.",
      isPlannedRun: true,
      isKeySession: week.week !== 13,
    };
  }

  if (day === 3) {
    return {
      ...base,
      sessionType: "easy",
      title: "Easy run",
      distanceLabel: week.week === 13 ? "3 easy mi" : "4-6 easy mi",
      instruction: "Conversational effort. Mostly WHOOP Zones 1-2.",
      details: ["10 min hip, calf, and ankle mobility", "Optional easy swim, steam, or compression", "No additional hard training"],
      strengthDetails: [],
      fuelingCue: null,
      isPlannedRun: true,
      isKeySession: false,
    };
  }

  if (day === 4) {
    return {
      ...base,
      sessionType: week.week === 13 ? "easy" : "strength",
      title: week.week === 13 ? "Easy activation" : "Easy run + strength",
      distanceLabel: week.week === 13 ? "2 easy mi" : "4-7 easy mi",
      instruction: week.week === 13 ? "Keep it relaxed. Stop while you feel fresh." : "Easy miles, then 35-40 minutes of controlled strength.",
      details: [],
      strengthDetails: week.week === 13 ? [] : [
        "Incline dumbbell press 3 x 8",
        "Pull-ups or pulldown 3 x 8-10",
        "Single-leg RDL 2 x 8/leg + step-ups 2 x 8/leg",
        "Farmer carry 3 rounds + side plank 3 x 30-45 sec",
      ],
      fuelingCue: null,
      isPlannedRun: true,
      isKeySession: false,
    };
  }

  if (day === 5) {
    return {
      ...base,
      sessionType: "rest",
      title: "Rest first",
      distanceLabel: week.week === 13 ? "Full rest" : "Rest or 3-5 very easy mi",
      instruction: "This is the first run removed when sleep or recovery deteriorates.",
      details: ["No catch-up work", "Prepare Saturday fuel, fluids, and route"],
      strengthDetails: [],
      fuelingCue: "Build carbohydrate availability for the long run.",
      isPlannedRun: false,
      isKeySession: false,
    };
  }

  if (day === 6) {
    if (week.week === 13) {
      return {
        ...base,
        sessionType: "setup",
        title: "Race setup",
        distanceLabel: "Optional 1-2 mi shakeout",
        instruction: "Lay out every item. Nothing new tomorrow.",
        details: ["Keep the shakeout easy", "Review fueling timing", "Get off your feet early"],
        strengthDetails: [],
        fuelingCue: "Carbohydrate-forward familiar food; moderate fluid and sodium.",
        isPlannedRun: false,
        isKeySession: false,
      };
    }

    return {
      ...base,
      sessionType: "long",
      title: "Long run",
      distanceLabel: week.longRunLabel,
      instruction: week.longRunWorkout,
      details: ["Walk 5-10 minutes after", "Replace fluid and sodium", "Pool movement or compression later", "Avoid an immediate aggressive cold plunge"],
      strengthDetails: [],
      fuelingCue: "Start fueling at 20-25 minutes; build toward 60-75g carbohydrate/hour.",
      isPlannedRun: true,
      isKeySession: true,
    };
  }

  if (day === 0) {
    if (week.week === 13) {
      return {
        ...base,
        sessionType: "race",
        title: "Chicago Marathon",
        distanceLabel: "26.2 mi",
        instruction: "Start patient. Arrive at mile 20 able to hold form.",
        details: ["Miles 1-3: 9:15-9:20", "Miles 4-20: 9:05-9:10", "Miles 21-24: posture, cadence, fuel", "Final 2.2: race"],
        strengthDetails: [],
        fuelingCue: "100-150g carbohydrate 2.5-3 hours before; 60-75g/hour during.",
        isPlannedRun: true,
        isKeySession: true,
      };
    }

    return {
      ...base,
      sessionType: "recovery",
      title: "Easy run or recovery",
      distanceLabel: "3-5 easy mi",
      instruction: "Choose easy running or 30-40 minutes easy cycling/swimming on cutback weeks.",
      details: ["Tibialis raises 2 x 15", "Single-leg calf raises 2 x 12", "Glute bridges 2 x 15", "Banded lateral walks + dead bugs"],
      strengthDetails: [],
      fuelingCue: null,
      isPlannedRun: week.week >= 5 && ![7, 12].includes(week.week),
      isKeySession: false,
    };
  }

  return {
    ...base,
    sessionType: "rest",
    title: "Rest",
    distanceLabel: "No running",
    instruction: "Protect the work already done.",
    details: [],
    strengthDetails: [],
    fuelingCue: null,
    isPlannedRun: false,
    isKeySession: false,
  };
}

export function getChicagoDayPrescription(date: string): GoalDayPrescription {
  const parsed = parseDateKey(date);
  const day = parsed.getUTCDay();
  const week = getChicagoGoalWeek(date);

  if (!week) {
    if (date < CHICAGO_MARATHON_START_DATE) {
      return {
        date,
        dayName: DAY_NAMES[day],
        sessionType: "setup",
        title: "Setup weekend",
        distanceLabel: "No catch-up mileage",
        instruction: "Set the week up. The build begins Monday, July 13.",
        details: ["Block the four runs on your calendar", "Prepare Tuesday workout fuel", "Choose a fixed wake time and count back 8.5 hours", "Run easy only if it was already planned"],
        strengthDetails: [],
        fuelingCue: "Eat normally. Do not start the build depleted.",
        sleepTarget: "8.5 hours in bed",
        isPlannedRun: false,
        isKeySession: false,
      };
    }

    return {
      date,
      dayName: DAY_NAMES[day],
      sessionType: "recovery",
      title: "Recover and review",
      distanceLabel: "Goal complete",
      instruction: "Let the result settle before choosing the next build.",
      details: [],
      strengthDetails: [],
      fuelingCue: null,
      sleepTarget: "8+ hours in bed",
      isPlannedRun: false,
      isKeySession: false,
    };
  }

  return standardPrescription(date, week, day);
}

export function getGoalAdjustment(prescription: GoalDayPrescription, health: GoalHealthSignals): GoalAdjustment {
  if (health.painAffectingStride) {
    return {
      mode: "stop",
      label: "Stop signal",
      message: "Do not run through pain that changes your stride. Rest and get evaluated.",
    };
  }

  const recentReds = (health.recentRecoveries ?? []).slice(0, 3).filter((value) => value !== null && value < 34).length;
  if (recentReds >= 2) {
    return {
      mode: "recover",
      label: "Recovery override",
      message: "Two red recoveries in three days: remove speed and lower-body strength; reduce the week by 20%.",
    };
  }

  if (health.recovery !== null && health.recovery < 34) {
    return {
      mode: "recover",
      label: "Red recovery",
      message: prescription.isKeySession ? "Replace the key session with easy Zone 1-2 or rest." : "Easy Zone 1-2 only, or rest.",
    };
  }

  const shortSleep = health.sleepMinutes !== null && health.sleepMinutes < 420;
  if ((health.recovery !== null && health.recovery < 67 && shortSleep) || health.legsFeelDead) {
    return {
      mode: "reduce",
      label: "Modify today",
      message: "Reduce the session 20-30%, keep it easy, and remove lifting volume.",
    };
  }

  if (health.recovery !== null && health.recovery < 67) {
    return {
      mode: "check",
      label: "Body check",
      message: "Yellow recovery: proceed only if legs feel normal, sleep was 7+ hours, and no pain is present.",
    };
  }

  return {
    mode: "follow",
    label: health.recovery === null ? "Follow the plan" : "Green light",
    message: health.recovery === null ? "Use body feel and keep easy days genuinely easy." : "Follow the plan. Do not add extra work because you feel good.",
  };
}

export function getGoalNutritionTarget(prescription: GoalDayPrescription): GoalNutritionTarget {
  if (prescription.sessionType === "race") {
    return {
      protein: "150-170g",
      carbohydrates: "Race protocol",
      timing: "100-150g carbohydrate 2.5-3 hours before; 60-75g per hour during.",
    };
  }

  if (prescription.sessionType === "long" || prescription.sessionType === "quality") {
    return {
      protein: "150-170g",
      carbohydrates: "425-550g",
      timing: "75-125g carbohydrate and 20-30g protein 2-3 hours before. Recover with 30-40g protein and 75-125g carbohydrate.",
    };
  }

  if (prescription.sessionType === "easy" || prescription.sessionType === "strength" || prescription.sessionType === "recovery") {
    return {
      protein: "150-170g",
      carbohydrates: "325-425g",
      timing: "Fuel the work across four meals or feedings. Do not train depleted.",
    };
  }

  return {
    protein: "150-170g",
    carbohydrates: "250-325g",
    timing: "Rest-day range. Keep familiar food and support the next training day.",
  };
}

export function getGoalDriftSignal(input: {
  currentDate: string;
  logs: GoalDailyLog[];
  sleepPerformances?: number[];
  recentRecoveries?: Array<number | null>;
}): GoalDriftSignal {
  const reasons: string[] = [];
  const sortedLogs = [...input.logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
  const recentStartCandidate = shiftDateKey(input.currentDate, -8);
  const recentStart = recentStartCandidate < CHICAGO_MARATHON_START_DATE
    ? CHICAGO_MARATHON_START_DATE
    : recentStartCandidate;
  const expectedPlannedRuns: Array<{ date: string; status: GoalLogStatus | "unconfirmed" }> = [];

  if (input.currentDate >= CHICAGO_MARATHON_START_DATE) {
    for (let date = recentStart; date <= input.currentDate; date = shiftDateKey(date, 1)) {
      const prescription = getChicagoDayPrescription(date);
      if (!prescription.isPlannedRun) continue;
      const log = sortedLogs.find((entry) => entry.logDate === date);
      if (date === input.currentDate && !log) continue;
      expectedPlannedRuns.push({ date, status: log?.status ?? "unconfirmed" });
    }
  }

  let consecutiveMisses = 0;
  let maxConsecutiveMisses = 0;

  for (const run of expectedPlannedRuns) {
    if (run.status === "skipped" || run.status === "unconfirmed") {
      consecutiveMisses += 1;
      maxConsecutiveMisses = Math.max(maxConsecutiveMisses, consecutiveMisses);
    } else {
      consecutiveMisses = 0;
    }
  }

  if (maxConsecutiveMisses >= 2) reasons.push("Two planned runs are unconfirmed in a row");

  const sleep = (input.sleepPerformances ?? []).filter((value) => Number.isFinite(value));
  if (sleep.length >= 3 && sleep.reduce((sum, value) => sum + value, 0) / sleep.length < 80) {
    reasons.push("Average sleep performance is below 80%");
  }

  const redCount = (input.recentRecoveries ?? []).slice(0, 3).filter((value) => value !== null && value < 34).length;
  if (redCount >= 2) reasons.push("Two red recoveries landed inside three days");
  if (sortedLogs.some((log) => log.painAffectingStride)) reasons.push("Pain affecting stride was logged");

  const longRunLogs = sortedLogs.filter((log) => log.sessionType === "long" && log.status !== "skipped");
  if (longRunLogs.some((log) => log.fuelingCompleted === false)) reasons.push("A long run was completed without the planned fueling");

  if (reasons.length >= 2 || reasons.some((reason) => reason.includes("pain") || reason.startsWith("Two planned"))) {
    return {
      level: "drifting",
      label: "Drift detected",
      message: "Do not make up missed work. Protect the next honest session and return to the weekly structure.",
      reasons,
    };
  }

  if (reasons.length === 1) {
    return {
      level: "watch",
      label: "Watch the pattern",
      message: "One signal needs attention. Adjust early so it does not become a lost week.",
      reasons,
    };
  }

  return {
    level: "on_track",
    label: "On plan",
    message: "The goal is repeatability. Keep the next appointment with the plan.",
    reasons: [],
  };
}

export function getWeeklyGoalScore(input: {
  week: DatedGoalWeek;
  logs: GoalDailyLog[];
  sleepPerformances: number[];
}): {
  completedRuns: number;
  plannedRunsGoal: string;
  longRunCompleted: boolean;
  strengthSessions: number;
  averageSleepPerformance: number | null;
  longRunFueled: boolean | null;
  painFree: boolean;
  wins: number;
} {
  const completedLogs = input.logs.filter((log) => log.status === "completed" || log.status === "modified");
  const completedRuns = completedLogs.filter((log) => ["quality", "easy", "long", "race"].includes(log.sessionType)).length;
  const longRun = input.logs.find((log) => log.sessionType === "long" || log.sessionType === "race");
  const strengthSessions = completedLogs.filter((log) => log.strengthCompleted).length;
  const averageSleepPerformance = input.sleepPerformances.length
    ? Math.round(input.sleepPerformances.reduce((sum, value) => sum + value, 0) / input.sleepPerformances.length)
    : null;
  const longRunCompleted = Boolean(longRun && longRun.status !== "skipped");
  const longRunFueled = longRunCompleted ? longRun?.fuelingCompleted ?? null : null;
  const painFree = !input.logs.some((log) => log.painAffectingStride);
  const checks = [
    completedRuns >= 4,
    longRunCompleted,
    strengthSessions >= (input.week.week >= 11 ? 1 : 2),
    averageSleepPerformance !== null && averageSleepPerformance >= 85,
    longRunFueled === true,
    painFree,
  ];

  return {
    completedRuns,
    plannedRunsGoal: "4-5",
    longRunCompleted,
    strengthSessions,
    averageSleepPerformance,
    longRunFueled,
    painFree,
    wins: checks.filter(Boolean).length,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildDatedGoalEmailPayload(input: {
  displayName?: string | null;
  currentDate: string;
  eventDate?: string;
  appUrl: string;
  health: GoalHealthSignals;
  drift: GoalDriftSignal;
  weekMilesCompleted?: number;
}): DatedGoalEmailPayload {
  const prescription = getChicagoDayPrescription(input.currentDate);
  const week = getChicagoGoalWeek(input.currentDate);
  const countdown = getGoalCountdownDays(input.currentDate, input.eventDate);
  const adjustment = getGoalAdjustment(prescription, input.health);
  const nutrition = getGoalNutritionTarget(prescription);
  const greeting = input.displayName ? `Good morning ${input.displayName.split(" ")[0]},` : "Good morning,";
  const subject = `${countdown} days to Chicago: ${prescription.title}`;
  const weekLine = week
    ? `Week ${week.week}/13 | ${week.mileageLabel} | Long run ${week.longRunLabel} | ${week.keyFocus}`
    : "Setup weekend | The 13-week build starts Monday";
  const completedLine = week && input.weekMilesCompleted !== undefined
    ? `${input.weekMilesCompleted.toFixed(1)} miles logged this week`
    : null;
  const previewText = `${prescription.title}. ${prescription.instruction}`;
  const detailLines = prescription.details.slice(0, 3).map((detail) => `- ${detail}`);

  const text = [
    `${countdown} DAYS TO CHICAGO`,
    greeting,
    "",
    weekLine,
    completedLine,
    "",
    `TODAY: ${prescription.title}`,
    prescription.distanceLabel,
    prescription.instruction,
    ...detailLines,
    "",
    `${adjustment.label}: ${adjustment.message}`,
    `Sleep: ${prescription.sleepTarget}`,
    `Daily fuel: ${nutrition.protein} protein | ${nutrition.carbohydrates} carbohydrate`,
    prescription.fuelingCue ? `Fuel: ${prescription.fuelingCue}` : null,
    "",
    `${input.drift.label}: ${input.drift.message}`,
    ...input.drift.reasons.slice(0, 2).map((reason) => `- ${reason}`),
    "",
    `Log today's work: ${input.appUrl}`,
    "",
    "You do not need to become tougher. You need to become more repeatable.",
  ].filter((line): line is string => line !== null).join("\n");

  const detailsHtml = prescription.details.slice(0, 3).map((detail) => `<li style="margin:0 0 6px 0;">${escapeHtml(detail)}</li>`).join("");
  const driftReasonsHtml = input.drift.reasons.slice(0, 2).map((reason) => `<li style="margin:0 0 6px 0;">${escapeHtml(reason)}</li>`).join("");

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#070b12;color:#e8edf5;padding:28px 20px;max-width:620px;margin:0 auto;">
      <p style="margin:0 0 8px;color:#55c7ff;font-size:12px;font-weight:700;letter-spacing:1.6px;">${countdown} DAYS TO CHICAGO</p>
      <h1 style="margin:0 0 8px;font-size:26px;line-height:1.15;">${escapeHtml(prescription.title)}</h1>
      <p style="margin:0 0 22px;color:#9ba8b8;font-size:14px;">${escapeHtml(greeting)} ${escapeHtml(weekLine)}</p>

      <div style="border:1px solid #203044;background:#0c1420;border-radius:12px;padding:18px;margin-bottom:14px;">
        <p style="margin:0 0 6px;color:#55c7ff;font-size:11px;font-weight:700;letter-spacing:1.3px;">TODAY'S WORK</p>
        <p style="margin:0 0 8px;font-size:19px;font-weight:700;">${escapeHtml(prescription.distanceLabel)}</p>
        <p style="margin:0 0 12px;color:#d6dde7;line-height:1.5;">${escapeHtml(prescription.instruction)}</p>
        ${detailsHtml ? `<ul style="margin:0;padding-left:18px;color:#9ba8b8;font-size:13px;line-height:1.45;">${detailsHtml}</ul>` : ""}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="border:1px solid #203044;background:#0a111b;border-radius:10px;padding:13px;">
          <p style="margin:0 0 5px;color:#9ba8b8;font-size:10px;letter-spacing:1px;">READINESS</p>
          <p style="margin:0;font-size:13px;line-height:1.45;"><strong>${escapeHtml(adjustment.label)}</strong><br>${escapeHtml(adjustment.message)}</p>
        </div>
        <div style="border:1px solid #203044;background:#0a111b;border-radius:10px;padding:13px;">
          <p style="margin:0 0 5px;color:#9ba8b8;font-size:10px;letter-spacing:1px;">RECOVERY</p>
          <p style="margin:0;font-size:13px;line-height:1.45;"><strong>${escapeHtml(prescription.sleepTarget)}</strong><br>${escapeHtml(nutrition.protein)} protein · ${escapeHtml(nutrition.carbohydrates)} carbs</p>
        </div>
      </div>

      <div style="border-left:3px solid ${input.drift.level === "drifting" ? "#fb7185" : input.drift.level === "watch" ? "#fbbf24" : "#34d399"};padding:2px 0 2px 13px;margin:18px 0;">
        <p style="margin:0 0 5px;font-size:14px;font-weight:700;">${escapeHtml(input.drift.label)}</p>
        <p style="margin:0;color:#9ba8b8;font-size:13px;line-height:1.45;">${escapeHtml(input.drift.message)}</p>
        ${driftReasonsHtml ? `<ul style="margin:8px 0 0;padding-left:18px;color:#9ba8b8;font-size:12px;">${driftReasonsHtml}</ul>` : ""}
      </div>

      <a href="${escapeHtml(input.appUrl)}" style="display:block;background:#55c7ff;color:#04101a;text-align:center;text-decoration:none;font-weight:800;padding:14px 18px;border-radius:10px;">Open today's plan</a>
      <p style="margin:18px 0 0;color:#758195;text-align:center;font-size:12px;">You do not need to become tougher. You need to become more repeatable.</p>
    </div>
  `;

  return { subject, previewText, text, html };
}
