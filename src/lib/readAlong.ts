import type { ControllableType } from "@/components/ControllableCard";
import { getBookControllable } from "@/lib/bookWorld";

export type ReadingStatus = "reading_now" | "finished" | "not_started" | "rereading_or_leading";

export type ReadAlongSectionId =
  | "dashboard"
  | "awareness"
  | "perspective"
  | "habit"
  | "wellness"
  | "environment"
  | "ego"
  | "integration";

export interface ReadAlongSection {
  id: ReadAlongSectionId;
  title: string;
  eyebrow: string;
  summary: string;
  rep: string;
  reflectionPrompt: string;
  targetControllable: ControllableType | "ego" | "integration";
}

export interface ReadAlongProgress {
  status: ReadingStatus;
  currentSectionId: ReadAlongSectionId;
  completedSectionIds: ReadAlongSectionId[];
  completedRepIds: ReadAlongSectionId[];
  startedAt: string;
  bookCompletedAt: string | null;
}

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  reading_now: "Reading now",
  finished: "Finished it",
  not_started: "Haven't started yet",
  rereading_or_leading: "Rereading / leading others",
};

export const READING_STATUS_DESCRIPTIONS: Record<ReadingStatus, string> = {
  reading_now: "Keep the app spoiler-safe and train what you have already met.",
  finished: "Move from the book into the 7-Day Reset and Daily Charge.",
  not_started: "Find your Starting Charge first, then use the book as the origin story.",
  rereading_or_leading: "Use Read Along as a guided path for a second pass or group rhythm.",
};

export const READ_ALONG_SECTIONS: ReadAlongSection[] = [
  {
    id: "dashboard",
    title: "The Dashboard",
    eyebrow: "Origin",
    summary: "The book gives you the language for what is yours to control and what needs to be released.",
    rep: "Open the app and name one signal you can actually work with today.",
    reflectionPrompt: "What part of your life needs a clearer read right now?",
    targetControllable: "awareness",
  },
  {
    id: "awareness",
    title: "Awareness",
    eyebrow: "See Clearly",
    summary: "Awareness is the first rep: noticing what is true before Ego turns it into a story.",
    rep: "Write one true sentence without judging it.",
    reflectionPrompt: "What is true right now?",
    targetControllable: "awareness",
  },
  {
    id: "perspective",
    title: "Perspective",
    eyebrow: "Reframe",
    summary: "Perspective slows the moment down so a heavy story does not become the whole truth.",
    rep: "Rewrite one pressure into a truer, calmer sentence.",
    reflectionPrompt: "What story am I telling myself?",
    targetControllable: "perspective",
  },
  {
    id: "habit",
    title: "Habit",
    eyebrow: "Kept Promises",
    summary: "Habit turns belief into evidence through small promises kept consistently.",
    rep: "Choose one promise small enough to finish before the day ends.",
    reflectionPrompt: "What promise can I keep today?",
    targetControllable: "habit",
  },
  {
    id: "wellness",
    title: "Wellness",
    eyebrow: "Protect The Vessel",
    summary: "Wellness protects the body and nervous system that carry the work.",
    rep: "Take one recovery move before demanding more from yourself.",
    reflectionPrompt: "What does my body need before I demand more from it?",
    targetControllable: "wellness",
  },
  {
    id: "environment",
    title: "Environment",
    eyebrow: "Change The Field",
    summary: "Environment shapes the conditions around you so the right move becomes easier.",
    rep: "Remove one point of friction from your space, calendar, or people loop.",
    reflectionPrompt: "What needs to change around me so I can show up better?",
    targetControllable: "environment",
  },
  {
    id: "ego",
    title: "Ego",
    eyebrow: "False Voice",
    summary: "Ego is the rival voice that turns drift, pressure, comparison, and fear into identity.",
    rep: "Name the false voice, then answer it with one Controllable response.",
    reflectionPrompt: "Where did Ego get loud today?",
    targetControllable: "ego",
  },
  {
    id: "integration",
    title: "Integration",
    eyebrow: "Chapter 2",
    summary: "The framework becomes identity when you keep practicing it after the page closes.",
    rep: "Choose the next 7-day reset or daily promise that fits this season.",
    reflectionPrompt: "What is the next season asking you to practice?",
    targetControllable: "integration",
  },
];

export const DEFAULT_READING_STATUS: ReadingStatus = "reading_now";
export const DEFAULT_READ_ALONG_SECTION_ID: ReadAlongSectionId = "dashboard";

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return (
    value === "reading_now" ||
    value === "finished" ||
    value === "not_started" ||
    value === "rereading_or_leading"
  );
}

export function isReadAlongSectionId(value: unknown): value is ReadAlongSectionId {
  return READ_ALONG_SECTIONS.some((section) => section.id === value);
}

export function normalizeReadingStatus(value: unknown, fallback: ReadingStatus = DEFAULT_READING_STATUS): ReadingStatus {
  return isReadingStatus(value) ? value : fallback;
}

export function createReadAlongProgress(input: Partial<ReadAlongProgress> = {}): ReadAlongProgress {
  const status = normalizeReadingStatus(input.status);
  const currentSectionId = isReadAlongSectionId(input.currentSectionId)
    ? input.currentSectionId
    : getInitialSectionForReadingStatus(status);
  const completedSectionIds = normalizeSectionIds(input.completedSectionIds);
  const completedRepIds = normalizeSectionIds(input.completedRepIds);
  const now = new Date().toISOString();

  return {
    status,
    currentSectionId,
    completedSectionIds,
    completedRepIds,
    startedAt: typeof input.startedAt === "string" ? input.startedAt : now,
    bookCompletedAt: typeof input.bookCompletedAt === "string" ? input.bookCompletedAt : null,
  };
}

export function normalizeReadAlongProgress(value: unknown): ReadAlongProgress {
  if (!value || typeof value !== "object") return createReadAlongProgress();
  return createReadAlongProgress(value as Partial<ReadAlongProgress>);
}

export function getReadAlongStorageKey(userId: string | null | undefined): string {
  return `read_along_progress_${userId || "guest"}`;
}

export function getInitialSectionForReadingStatus(status: ReadingStatus): ReadAlongSectionId {
  if (status === "finished") return "integration";
  return "dashboard";
}

export function getReadAlongSection(id: ReadAlongSectionId): ReadAlongSection {
  return READ_ALONG_SECTIONS.find((section) => section.id === id) ?? READ_ALONG_SECTIONS[0];
}

export function getNextReadAlongSectionId(currentSectionId: ReadAlongSectionId): ReadAlongSectionId {
  const index = READ_ALONG_SECTIONS.findIndex((section) => section.id === currentSectionId);
  return READ_ALONG_SECTIONS[Math.min(index + 1, READ_ALONG_SECTIONS.length - 1)]?.id ?? currentSectionId;
}

export function getVisibleReadAlongSections(progress: ReadAlongProgress): ReadAlongSection[] {
  const allowed = new Set<ReadAlongSectionId>([
    ...progress.completedSectionIds,
    progress.currentSectionId,
  ]);

  return READ_ALONG_SECTIONS.filter((section) => allowed.has(section.id));
}

export function getReadAlongProgressPercent(progress: ReadAlongProgress): number {
  const completed = new Set(progress.completedSectionIds).size;
  return Math.round((completed / READ_ALONG_SECTIONS.length) * 100);
}

export function completeReadAlongSection(
  progress: ReadAlongProgress,
  sectionId: ReadAlongSectionId,
  completedAt = new Date().toISOString(),
): ReadAlongProgress {
  const completedSectionIds = addUniqueSection(progress.completedSectionIds, sectionId);
  const nextSectionId = getNextReadAlongSectionId(sectionId);
  const allComplete = completedSectionIds.length >= READ_ALONG_SECTIONS.length;

  return {
    ...progress,
    currentSectionId: allComplete ? sectionId : nextSectionId,
    completedSectionIds,
    bookCompletedAt: allComplete ? progress.bookCompletedAt ?? completedAt : progress.bookCompletedAt,
  };
}

export function completeReadAlongRep(progress: ReadAlongProgress, sectionId: ReadAlongSectionId): ReadAlongProgress {
  return {
    ...progress,
    completedRepIds: addUniqueSection(progress.completedRepIds, sectionId),
  };
}

export function getReadAlongSectionIcon(section: ReadAlongSection): string {
  if (section.targetControllable === "ego") return "⚔";
  if (section.targetControllable === "integration") return "⚡";
  return getBookControllable(section.targetControllable).emoji;
}

function normalizeSectionIds(value: unknown): ReadAlongSectionId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is ReadAlongSectionId => isReadAlongSectionId(id));
}

function addUniqueSection(current: ReadAlongSectionId[], sectionId: ReadAlongSectionId): ReadAlongSectionId[] {
  return current.includes(sectionId) ? current : [...current, sectionId];
}
