import type { ControllableType } from "@/components/ControllableCard";

export interface ControllableTheme {
  emoji: string;
  label: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  tip: string;
}

const themes: Record<ControllableType, ControllableTheme> = {
  awareness: {
    emoji: "🦉",
    label: "Awareness",
    borderClass: "border-l-2 border-awareness/30",
    bgClass: "bg-awareness-soft",
    textClass: "text-awareness",
    tip: "🦉 Notice where your minutes actually went.",
  },
  perspective: {
    emoji: "🐢",
    label: "Perspective",
    borderClass: "border-l-2 border-perspective/30",
    bgClass: "bg-perspective-soft",
    textClass: "text-perspective",
    tip: "🐢 A kept promise compounds. A broken one teaches.",
  },
  habit: {
    emoji: "🦈",
    label: "Habit",
    borderClass: "border-l-2 border-habit/30",
    bgClass: "bg-habit-soft",
    textClass: "text-habit",
    tip: "🦈 Reps over results. Show up again.",
  },
  wellness: {
    emoji: "🛰️",
    label: "Wellness",
    borderClass: "border-l-2 border-wellness/30",
    bgClass: "bg-wellness-soft",
    textClass: "text-wellness",
    tip: "🛰️ Your body is the vehicle. Maintain it.",
  },
  environment: {
    emoji: "🚀",
    label: "Environment",
    borderClass: "border-l-2 border-environment/30",
    bgClass: "bg-environment-soft",
    textClass: "text-environment",
    tip: "🚀 Your mission shapes your environment.",
  },
};

export function getControllableTheme(type: ControllableType): ControllableTheme {
  return themes[type];
}

/** Badge component markup helper — returns props for inline use */
export function getControllableBadge(type: ControllableType) {
  const t = themes[type];
  return { emoji: t.emoji, label: t.label, className: t.textClass };
}

/** Rotating controllable based on day number (1-indexed, wraps) */
const ROTATION: ControllableType[] = ["awareness", "perspective", "habit", "wellness", "environment"];

export function getControllableForDay(dayNumber: number): ControllableType {
  return ROTATION[(dayNumber - 1) % ROTATION.length];
}

/** All controllable types in order */
export const ALL_CONTROLLABLES: ControllableType[] = ROTATION;

/* ── Leveling System (Pokemon-style 1-99) ── */

/** XP needed to reach a given level: level^2 * 25 */
export function getXpForLevel(level: number): number {
  return level * level * 25;
}

/** Derive current level from total XP (capped at 99) */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const raw = Math.floor(Math.sqrt(totalXp / 25));
  return Math.min(Math.max(raw, 1), 99);
}

/** Progress within the current level (0-1) */
export function getLevelProgress(totalXp: number): { level: number; current: number; next: number; progress: number } {
  const level = getLevelFromXp(totalXp);
  const current = getXpForLevel(level);
  const next = getXpForLevel(level + 1);
  const progress = next > current ? Math.min((totalXp - current) / (next - current), 1) : 1;
  return { level, current, next, progress };
}
