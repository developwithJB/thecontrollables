export const CONTROLLABLE_GUIDE_IDS = [
  "awareness",
  "perspective",
  "habit",
  "wellness",
  "environment",
] as const;

export type ControllableGuideId = (typeof CONTROLLABLE_GUIDE_IDS)[number];

export interface ControllableGuide {
  id: ControllableGuideId;
  name: string;
  emoji: string;
  role: string;
  domain: string;
}

export interface ControllableGuideClasses {
  borderClass: string;
  bgClass: string;
  textClass: string;
  cardClass: string;
}

export const CONTROLLABLE_GUIDES: Record<ControllableGuideId, ControllableGuide> = {
  awareness: {
    id: "awareness",
    name: "Awareness",
    emoji: "🦉",
    role: "See clearly",
    domain: "clarity / signals / patterns",
  },
  perspective: {
    id: "perspective",
    name: "Perspective",
    emoji: "🐢",
    role: "Reframe the story",
    domain: "meaning / interpretation / mindset",
  },
  habit: {
    id: "habit",
    name: "Habit",
    emoji: "🦈",
    role: "Build the next repeat",
    domain: "action / consistency / routines",
  },
  wellness: {
    id: "wellness",
    name: "Wellness",
    emoji: "🛰️",
    role: "Protect your charge",
    domain: "energy / recovery / body",
  },
  environment: {
    id: "environment",
    name: "Environment",
    emoji: "🚀",
    role: "Shape the space",
    domain: "surroundings / relationships / friction",
  },
};

export const ORDERED_CONTROLLABLE_GUIDES: ControllableGuide[] = CONTROLLABLE_GUIDE_IDS.map(
  (id) => CONTROLLABLE_GUIDES[id],
);

const CONTROLLABLE_GUIDE_CLASSES: Record<ControllableGuideId, ControllableGuideClasses> = {
  awareness: {
    borderClass: "border-awareness/30",
    bgClass: "bg-awareness-soft",
    textClass: "text-awareness",
    cardClass: "bg-awareness-soft hover:bg-awareness/10 border-awareness/20",
  },
  perspective: {
    borderClass: "border-perspective/30",
    bgClass: "bg-perspective-soft",
    textClass: "text-perspective",
    cardClass: "bg-perspective-soft hover:bg-perspective/10 border-perspective/20",
  },
  habit: {
    borderClass: "border-habit/30",
    bgClass: "bg-habit-soft",
    textClass: "text-habit",
    cardClass: "bg-habit-soft hover:bg-habit/10 border-habit/20",
  },
  wellness: {
    borderClass: "border-wellness/30",
    bgClass: "bg-wellness-soft",
    textClass: "text-wellness",
    cardClass: "bg-wellness-soft hover:bg-wellness/10 border-wellness/20",
  },
  environment: {
    borderClass: "border-environment/30",
    bgClass: "bg-environment-soft",
    textClass: "text-environment",
    cardClass: "bg-environment-soft hover:bg-environment/10 border-environment/20",
  },
};

export const isControllableGuideId = (value: unknown): value is ControllableGuideId => {
  return CONTROLLABLE_GUIDE_IDS.includes(value as ControllableGuideId);
};

export const normalizeControllableGuideId = (
  value: unknown,
  fallback: ControllableGuideId = "awareness",
): ControllableGuideId => {
  return isControllableGuideId(value) ? value : fallback;
};

export const getControllableGuide = (id: ControllableGuideId): ControllableGuide => {
  return CONTROLLABLE_GUIDES[id];
};

export const getControllableGuideClasses = (id: ControllableGuideId): ControllableGuideClasses => {
  return CONTROLLABLE_GUIDE_CLASSES[id];
};
