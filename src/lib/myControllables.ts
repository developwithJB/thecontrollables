import type { ControllableType } from "@/components/ControllableCard";
import { BOOK_CONTROLLABLES, getBookControllable, SEVEN_DAY_CONTROLLABLES_RESET } from "@/lib/bookWorld";
import { getControllableForDay } from "@/lib/controllableTheme";

export type EgoPatternId = "all_or_nothing" | "comparison" | "overcontrol" | "avoidance" | "approval";
export type ProofVisibility = "private" | "anonymous" | "public";
export type ProofEntryKind = "kept_promise" | "recovery_win";
export type ProofCardId =
  | "started"
  | "strongest"
  | "first_day"
  | "reset_complete"
  | "self_trust_level"
  | "ten_promises"
  | "returned_after_drift"
  | "local_contribution";

export interface EgoPattern {
  id: EgoPatternId;
  label: string;
  signal: string;
  response: string;
}

export interface StartingReadAnswers {
  strongest: ControllableType;
  growth: ControllableType;
  egoPattern: EgoPatternId;
  avoidedPromise: string;
  releaseGrip: string;
  resetVision: string;
}

export interface StartingReadResult extends StartingReadAnswers {
  completedAt: string;
  recommendedFirstPractice: string;
  recommendedQuest: string;
  shareText: string;
}

export interface LocalProofEntry {
  id: string;
  date: string;
  createdAt: string;
  controllable: ControllableType;
  promise: string;
  kind: ProofEntryKind;
  xp: number;
}

export interface LocalParticipation {
  city: string;
  state: string;
  handle: string;
  visibility: ProofVisibility;
}

export interface MyControllablesProfile {
  startedAt: string | null;
  assessment: StartingReadResult | null;
  participation: LocalParticipation;
  proofEntries: LocalProofEntry[];
  joinedChallengeIds: string[];
  resetCompletedAt: string | null;
}

export interface SelfTrustStats {
  totalXp: number;
  level: number;
  levelProgress: number;
  keptPromises: number;
  recoveryWins: number;
  questsCompleted: number;
  todayEntry: LocalProofEntry | null;
  recoveryAvailable: boolean;
}

export interface DailyTrainingPlan {
  controllable: ControllableType;
  promise: string;
  recoveryPrompt: string;
}

export interface ProofCard {
  id: ProofCardId;
  title: string;
  eyebrow: string;
  body: string;
  unlocked: boolean;
}

export interface LocalBoard {
  id: "city" | "state" | "friends" | "global";
  label: string;
  scope: string;
  weeklyKeptPromises: number;
  recoveryWins: number;
  resetCompletions: number;
  mostImproved: string;
  yourContribution: number;
}

export interface LocalChallenge {
  id: string;
  title: string;
  scope: string;
  practice: string;
  days: number;
}

export const EGO_PATTERNS: EgoPattern[] = [
  {
    id: "all_or_nothing",
    label: "All-or-nothing pressure",
    signal: "If you cannot do everything, Ego says you should do nothing.",
    response: "Keep one small promise before the day ends.",
  },
  {
    id: "comparison",
    label: "Comparison noise",
    signal: "Ego turns someone else's pace into a verdict on yours.",
    response: "Return to your next honest move.",
  },
  {
    id: "overcontrol",
    label: "Over-control",
    signal: "Ego tries to grip outcomes that were never fully yours.",
    response: "Name what you can control and release the rest.",
  },
  {
    id: "avoidance",
    label: "Avoidance drift",
    signal: "Ego makes delay feel safer than the truth.",
    response: "Tell the truth early and take the smallest clean step.",
  },
  {
    id: "approval",
    label: "Approval chasing",
    signal: "Ego asks other people to certify what your integrity already knows.",
    response: "Keep the promise where nobody has to clap.",
  },
];

export const DEFAULT_PARTICIPATION: LocalParticipation = {
  city: "",
  state: "",
  handle: "",
  visibility: "private",
};

export const DEFAULT_MY_CONTROLLABLES_PROFILE: MyControllablesProfile = {
  startedAt: null,
  assessment: null,
  participation: DEFAULT_PARTICIPATION,
  proofEntries: [],
  joinedChallengeIds: [],
  resetCompletedAt: null,
};

const SELF_TRUST_XP_PER_LEVEL = 100;

export function getEgoPattern(id: EgoPatternId): EgoPattern {
  return EGO_PATTERNS.find((pattern) => pattern.id === id) ?? EGO_PATTERNS[0];
}

export function createStartingReadResult(answers: StartingReadAnswers): StartingReadResult {
  const growth = getBookControllable(answers.growth);
  const strongest = getBookControllable(answers.strongest);
  const ego = getEgoPattern(answers.egoPattern);

  return {
    ...answers,
    completedAt: new Date().toISOString(),
    recommendedFirstPractice: growth.recommendedPractice,
    recommendedQuest: `7-Day Reset: start with ${growth.name}`,
    shareText: `I started tracking My Controllables. Strongest right now: ${strongest.name}. Current training focus: ${growth.name}.`,
    egoPattern: ego.id,
  };
}

export function getDayKey(date = new Date()): string {
  return date.toLocaleDateString("sv-SE");
}

export function getYesterdayKey(date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getDayKey(yesterday);
}

export function getSelfTrustStats(profile: MyControllablesProfile, date = new Date()): SelfTrustStats {
  const today = getDayKey(date);
  const yesterday = getYesterdayKey(date);
  const todayEntry = profile.proofEntries.find((entry) => entry.date === today) ?? null;
  const keptPromises = profile.proofEntries.filter((entry) => entry.kind === "kept_promise").length;
  const recoveryWins = profile.proofEntries.filter((entry) => entry.kind === "recovery_win").length;
  const proofXp = profile.proofEntries.reduce((total, entry) => total + entry.xp, 0);
  const startingReadXp = profile.assessment ? 15 : 0;
  const resetXp = profile.resetCompletedAt ? 75 : 0;
  const totalXp = proofXp + startingReadXp + resetXp;
  const level = Math.max(1, Math.floor(totalXp / SELF_TRUST_XP_PER_LEVEL) + 1);
  const levelProgress = totalXp % SELF_TRUST_XP_PER_LEVEL;
  const hasYesterdayEntry = profile.proofEntries.some((entry) => entry.date === yesterday);
  const hasOlderEntry = profile.proofEntries.some((entry) => entry.date < yesterday);

  return {
    totalXp,
    level,
    levelProgress,
    keptPromises,
    recoveryWins,
    questsCompleted: profile.resetCompletedAt ? 1 : 0,
    todayEntry,
    recoveryAvailable: Boolean(profile.assessment && !todayEntry && !hasYesterdayEntry && hasOlderEntry),
  };
}

export function getDailyTrainingPlan(profile: MyControllablesProfile, date = new Date()): DailyTrainingPlan {
  const fallback = getControllableForDay(getDayOfYear(date));
  const controllable = profile.assessment?.growth ?? fallback;
  const guide = getBookControllable(controllable);

  return {
    controllable,
    promise: buildPromise(profile, guide.name),
    recoveryPrompt: `Return with ${guide.name}: one honest move, no shame story.`,
  };
}

export function createProofEntry(input: {
  controllable: ControllableType;
  promise: string;
  kind: ProofEntryKind;
  date?: Date;
}): LocalProofEntry {
  return {
    id: createId(),
    date: getDayKey(input.date),
    createdAt: new Date().toISOString(),
    controllable: input.controllable,
    promise: input.promise.trim(),
    kind: input.kind,
    xp: input.kind === "recovery_win" ? 35 : 25,
  };
}

export function getProofCards(profile: MyControllablesProfile): ProofCard[] {
  const stats = getSelfTrustStats(profile);
  const strongest = profile.assessment ? getBookControllable(profile.assessment.strongest) : null;
  const localOptIn = profile.participation.visibility !== "private" && Boolean(profile.participation.city || profile.participation.state);

  return [
    {
      id: "started",
      eyebrow: "Starting Read",
      title: "Started tracking My Controllables",
      body: profile.assessment?.shareText ?? "Create your first read to unlock this proof.",
      unlocked: Boolean(profile.assessment),
    },
    {
      id: "strongest",
      eyebrow: "Result",
      title: strongest ? `${strongest.name} is strongest right now` : "Strongest Controllable result",
      body: strongest ? `${strongest.role} ${strongest.coreQuestion}` : "Complete the 60-second read to reveal this.",
      unlocked: Boolean(profile.assessment),
    },
    {
      id: "first_day",
      eyebrow: "Practice",
      title: "Completed first day",
      body: "One kept promise is enough proof to begin.",
      unlocked: profile.proofEntries.length >= 1,
    },
    {
      id: "reset_complete",
      eyebrow: "Quest",
      title: "Completed the 7-Day Reset",
      body: "Seven days of control, release, and honest movement.",
      unlocked: Boolean(profile.resetCompletedAt),
    },
    {
      id: "self_trust_level",
      eyebrow: "Milestone",
      title: `Reached Self-Trust Level ${stats.level}`,
      body: "Self-trust is built through evidence you can return to.",
      unlocked: stats.level >= 2,
    },
    {
      id: "ten_promises",
      eyebrow: "Kept Promises",
      title: "Logged 10 kept promises",
      body: "Confidence Comes From Kept Promises.",
      unlocked: stats.keptPromises >= 10,
    },
    {
      id: "returned_after_drift",
      eyebrow: "Recovery",
      title: "Returned after drift",
      body: "Recovery is proof that a missed day does not get the final word.",
      unlocked: stats.recoveryWins >= 1,
    },
    {
      id: "local_contribution",
      eyebrow: "Local Proof",
      title: "Represented your city or state",
      body: "Your public proof shares contribution, not private reflection.",
      unlocked: localOptIn,
    },
  ];
}

export function getLocalBoards(profile: MyControllablesProfile): LocalBoard[] {
  const stats = getSelfTrustStats(profile);
  const city = profile.participation.city.trim() || "Your City";
  const state = profile.participation.state.trim() || "Your State";
  const contribution = stats.keptPromises + stats.recoveryWins + stats.questsCompleted;

  return [
    {
      id: "city",
      label: "City",
      scope: city,
      weeklyKeptPromises: 120 + stats.keptPromises,
      recoveryWins: 24 + stats.recoveryWins,
      resetCompletions: 8 + stats.questsCompleted,
      mostImproved: "Habit",
      yourContribution: contribution,
    },
    {
      id: "state",
      label: "State",
      scope: state,
      weeklyKeptPromises: 640 + stats.keptPromises,
      recoveryWins: 110 + stats.recoveryWins,
      resetCompletions: 41 + stats.questsCompleted,
      mostImproved: "Perspective",
      yourContribution: contribution,
    },
    {
      id: "friends",
      label: "Friends",
      scope: "Invite-only",
      weeklyKeptPromises: 38 + stats.keptPromises,
      recoveryWins: 7 + stats.recoveryWins,
      resetCompletions: 3 + stats.questsCompleted,
      mostImproved: "Awareness",
      yourContribution: contribution,
    },
    {
      id: "global",
      label: "Global",
      scope: "All active practice",
      weeklyKeptPromises: 3200 + stats.keptPromises,
      recoveryWins: 720 + stats.recoveryWins,
      resetCompletions: 184 + stats.questsCompleted,
      mostImproved: "Wellness",
      yourContribution: contribution,
    },
  ];
}

export function getLocalChallenges(profile: MyControllablesProfile): LocalChallenge[] {
  const city = profile.participation.city.trim() || "Chicago";
  const state = profile.participation.state.trim() || "Illinois";

  return [
    {
      id: "city-reset",
      title: `${city} 7-Day Reset`,
      scope: city,
      practice: "Complete one Control / Release / Move loop each day.",
      days: 7,
    },
    {
      id: "state-kept-promise",
      title: `${state} Kept Promise Challenge`,
      scope: state,
      practice: "Log one small kept promise before the day ends.",
      days: 7,
    },
    {
      id: "recovery-week",
      title: "Midwest Recovery Week",
      scope: "Regional",
      practice: "Turn drift into a recovery win without shame.",
      days: 7,
    },
  ];
}

export function getProofShareText(profile: MyControllablesProfile, card: ProofCard): string {
  const location =
    profile.participation.visibility === "private"
      ? ""
      : `\nRepresenting: ${profile.participation.city || "my city"}${profile.participation.state ? `, ${profile.participation.state}` : ""}`;

  return `${card.title}\n${card.body}${location}\n\nI am tracking My Controllables in The Dashboard.`;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function buildPromise(profile: MyControllablesProfile, guideName: string): string {
  if (profile.assessment?.avoidedPromise.trim()) {
    return profile.assessment.avoidedPromise.trim();
  }

  const resetDay = SEVEN_DAY_CONTROLLABLES_RESET.find((day) => day.focus === guideName);
  return resetDay ? resetDay.practice : getBookControllable(profile.assessment?.growth).recommendedPractice;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
