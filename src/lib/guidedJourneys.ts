// Guided Journeys - Pre-defined paths that eliminate blank-page anxiety
// Each journey auto-creates a Main Quest and starts the 7-Day Reset

import type { UserBuildCurrent, BuildScore } from "./build";

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
  isCustom?: boolean; // Generated from user's build data
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

// Custom focus configurations based on controllable
const CUSTOM_FOCUS_CONFIG: Record<string, {
  title: string;
  tagline: string;
  description: string;
  whatItHelps: string;
  dailyAction: string;
  emoji: string;
}> = {
  awareness: {
    title: "Sharpen Your Awareness",
    tagline: "See more, react less",
    description: "Your awareness score suggests room for growth. This focus helps you catch patterns before they control you.",
    whatItHelps: "Reactive behavior, missed signals, and autopilot living",
    dailyAction: "Notice one trigger and pause before reacting",
    emoji: "👁️",
  },
  perspective: {
    title: "Reclaim Your Perspective",
    tagline: "Zoom out, realign",
    description: "Your perspective needs attention. This focus helps you see the bigger picture and make better decisions.",
    whatItHelps: "Tunnel vision, reactive thinking, and lost priorities",
    dailyAction: "Ask yourself: will this matter in 30 days?",
    emoji: "🔭",
  },
  habit: {
    title: "Rebuild Your Habits",
    tagline: "Show up, stack wins",
    description: "Your habit consistency is flagging. This focus helps you show up reliably without relying on motivation.",
    whatItHelps: "Inconsistency, broken streaks, and starting over",
    dailyAction: "Complete one non-negotiable rep, no matter how small",
    emoji: "🔧",
  },
  wellness: {
    title: "Restore Your Foundation",
    tagline: "Energy first, output second",
    description: "Your wellness is the bottleneck. This focus prioritizes the basics that fuel everything else.",
    whatItHelps: "Low energy, burnout, and depleted reserves",
    dailyAction: "Prioritize one wellness basic: sleep, move, or eat well",
    emoji: "🔋",
  },
  environment: {
    title: "Design Your Environment",
    tagline: "Remove friction, add flow",
    description: "Your environment is working against you. This focus helps you shape your space to support your goals.",
    whatItHelps: "Distractions, friction, and willpower drain",
    dailyAction: "Remove one obstacle or prep one thing for tomorrow",
    emoji: "🏠",
  },
};

// Generate a custom focus based on user's build data
export function generateCustomFocus(
  build: UserBuildCurrent | BuildScore | null,
  assessmentHistory?: BuildScore[]
): GuidedJourney | null {
  if (!build) return null;

  // Find the lowest controllable
  const scores = {
    awareness: build.awareness,
    perspective: build.perspective,
    habit: build.habit,
    wellness: build.wellness,
    environment: build.environment,
  };

  let lowestControllable = "awareness";
  let lowestScore = scores.awareness;

  for (const [key, value] of Object.entries(scores)) {
    if (value < lowestScore) {
      lowestControllable = key;
      lowestScore = value;
    }
  }

  // Check for trends if we have history (declining scores)
  if (assessmentHistory && assessmentHistory.length >= 2) {
    const recent = assessmentHistory[0];
    const previous = assessmentHistory[1];
    
    // Find the controllable with the biggest decline
    const declines = {
      awareness: previous.awareness - recent.awareness,
      perspective: previous.perspective - recent.perspective,
      habit: previous.habit - recent.habit,
      wellness: previous.wellness - recent.wellness,
      environment: previous.environment - recent.environment,
    };

    let biggestDecline = 0;
    let decliningControllable = "";

    for (const [key, decline] of Object.entries(declines)) {
      if (decline > 0.2 && decline > biggestDecline) {
        biggestDecline = decline;
        decliningControllable = key;
      }
    }

    // If there's a significant decline, prioritize that over lowest score
    if (decliningControllable) {
      lowestControllable = decliningControllable;
    }
  }

  const config = CUSTOM_FOCUS_CONFIG[lowestControllable];
  if (!config) return null;

  return {
    id: `custom-${lowestControllable}`,
    title: config.title,
    tagline: config.tagline,
    description: config.description,
    whatItHelps: config.whatItHelps,
    dailyAction: config.dailyAction,
    duration: 7,
    emoji: config.emoji,
    isCustom: true,
  };
}

// Get journey ID for a custom focus (maps back to the standard journey for storage)
export function getStandardJourneyForCustom(customJourneyId: string): string {
  const controllable = customJourneyId.replace("custom-", "");
  const mapping: Record<string, string> = {
    awareness: "reduce-mental-noise",
    perspective: "refocus-on-what-matters",
    habit: "rebuild-momentum",
    wellness: "ground-yourself",
    environment: "reenter-the-game", // Default since no environment-specific journey
  };
  return mapping[controllable] || "reenter-the-game";
}
