import type { ControllableType } from "@/components/ControllableCard";
import { CONTROLLABLE_GUIDES, CONTROLLABLE_GUIDE_IDS, getControllableGuideClasses } from "@/lib/controllables";

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
    emoji: CONTROLLABLE_GUIDES.awareness.emoji,
    label: CONTROLLABLE_GUIDES.awareness.name,
    borderClass: `border-l-2 ${getControllableGuideClasses("awareness").borderClass}`,
    bgClass: getControllableGuideClasses("awareness").bgClass,
    textClass: getControllableGuideClasses("awareness").textClass,
    tip: "🦉 Notice where your minutes actually went.",
  },
  perspective: {
    emoji: CONTROLLABLE_GUIDES.perspective.emoji,
    label: CONTROLLABLE_GUIDES.perspective.name,
    borderClass: `border-l-2 ${getControllableGuideClasses("perspective").borderClass}`,
    bgClass: getControllableGuideClasses("perspective").bgClass,
    textClass: getControllableGuideClasses("perspective").textClass,
    tip: "🐢 A kept promise compounds. A broken one teaches.",
  },
  habit: {
    emoji: CONTROLLABLE_GUIDES.habit.emoji,
    label: CONTROLLABLE_GUIDES.habit.name,
    borderClass: `border-l-2 ${getControllableGuideClasses("habit").borderClass}`,
    bgClass: getControllableGuideClasses("habit").bgClass,
    textClass: getControllableGuideClasses("habit").textClass,
    tip: "🦈 Reps over results. Show up again.",
  },
  wellness: {
    emoji: CONTROLLABLE_GUIDES.wellness.emoji,
    label: CONTROLLABLE_GUIDES.wellness.name,
    borderClass: `border-l-2 ${getControllableGuideClasses("wellness").borderClass}`,
    bgClass: getControllableGuideClasses("wellness").bgClass,
    textClass: getControllableGuideClasses("wellness").textClass,
    tip: "🛰️ Your body is the vehicle. Maintain it.",
  },
  environment: {
    emoji: CONTROLLABLE_GUIDES.environment.emoji,
    label: CONTROLLABLE_GUIDES.environment.name,
    borderClass: `border-l-2 ${getControllableGuideClasses("environment").borderClass}`,
    bgClass: getControllableGuideClasses("environment").bgClass,
    textClass: getControllableGuideClasses("environment").textClass,
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
const ROTATION: ControllableType[] = [...CONTROLLABLE_GUIDE_IDS];

export function getControllableForDay(dayNumber: number): ControllableType {
  return ROTATION[(dayNumber - 1) % ROTATION.length];
}

/** All controllable types in order */
export const ALL_CONTROLLABLES: ControllableType[] = ROTATION;

/** Full controllable list with emoji + label for UI selectors */
export const CONTROLLABLE_LIST: { type: ControllableType; emoji: string; label: string }[] = ROTATION.map(
  (type) => ({ type, emoji: themes[type].emoji, label: themes[type].label })
);

/* ── Leveling System (1-99) ── */

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
