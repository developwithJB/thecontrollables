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
