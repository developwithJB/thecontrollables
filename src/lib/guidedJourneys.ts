// Guided Journeys - Pre-defined paths that eliminate blank-page anxiety
// Each journey auto-creates a Main Quest and starts the 7-Day Reset

export interface GuidedJourney {
  id: string;
  title: string;
  questTitle?: string; // Optional custom quest title (defaults to title)
  tagline: string;
  description: string;
  whatItHelps: string;
  dailyAction: string;
  duration: number; // days
  emoji: string;
  isDefault?: boolean;
}

// Get the quest title from a journey (uses questTitle if set, otherwise title)
export function getQuestTitleFromJourney(journey: GuidedJourney): string {
  return journey.questTitle || journey.title;
}

export const GUIDED_JOURNEYS: GuidedJourney[] = [
  {
    id: "reenter-the-game",
    title: "Re-enter the Game",
    tagline: "You don't need to know where you're going yet",
    description: "This helps you get back into the game. No pressure, just presence.",
    whatItHelps: "Getting unstuck and rebuilding basic momentum",
    dailyAction: "Complete one small, intentional action each day",
    duration: 7,
    emoji: "🎮",
    isDefault: true,
  },
  {
    id: "reduce-mental-noise",
    title: "Reduce Mental Noise",
    tagline: "Quiet the static, find the signal",
    description: "Create space between stimulus and response. Learn to observe without reacting.",
    whatItHelps: "Anxiety, overthinking, and mental clutter",
    dailyAction: "Practice one moment of stillness and reflection",
    duration: 7,
    emoji: "🧘",
  },
  {
    id: "rebuild-momentum",
    title: "Rebuild Momentum",
    tagline: "Small wins, stacked daily",
    description: "Start impossibly small. Show up before you try to perform.",
    whatItHelps: "Feeling stuck, inconsistent, or overwhelmed by goals",
    dailyAction: "Complete one micro-action that takes less than 5 minutes",
    duration: 7,
    emoji: "🔥",
  },
  {
    id: "ground-yourself",
    title: "Ground Yourself",
    tagline: "Return to your body and breath",
    description: "Reconnect with the basics: sleep, movement, nourishment. Your body is the vehicle.",
    whatItHelps: "Burnout, exhaustion, and feeling disconnected",
    dailyAction: "Honor one wellness basic: sleep, move, or eat well",
    duration: 7,
    emoji: "🌱",
  },
  {
    id: "refocus-on-what-matters",
    title: "Refocus on What Matters",
    tagline: "Cut the noise, aim true",
    description: "Zoom out. Identify what's actually important and let go of the rest.",
    whatItHelps: "Distraction, scattered priorities, and lack of clarity",
    dailyAction: "Identify one priority and protect time for it",
    duration: 7,
    emoji: "🎯",
  },
];

export const DEFAULT_JOURNEY_ID = "reenter-the-game";

export function getJourneyById(id: string): GuidedJourney | undefined {
  return GUIDED_JOURNEYS.find((j) => j.id === id);
}

export function getDefaultJourney(): GuidedJourney {
  return GUIDED_JOURNEYS.find((j) => j.isDefault) || GUIDED_JOURNEYS[0];
}

// Map journey to controllable focus (for internal tracking)
export function journeyToControllable(journeyId: string): string {
  const mapping: Record<string, string> = {
    "reenter-the-game": "habit",
    "reduce-mental-noise": "awareness",
    "rebuild-momentum": "habit",
    "ground-yourself": "wellness",
    "refocus-on-what-matters": "perspective",
  };
  return mapping[journeyId] || "habit";
}
