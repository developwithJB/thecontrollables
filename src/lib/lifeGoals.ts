// Life Goals System - Maps real-world habits and life changes to Snapshots
// This allows users to browse by "what they want to work on" rather than abstract framework concepts

export type GoalCategory = "break-habit" | "build-habit" | "mindset" | "wellness";

export interface LifeGoal {
  id: string;
  label: string;
  emoji: string;
  category: GoalCategory;
  relatedSnapshots: string[]; // Snapshot IDs
  tagline: string;
}

// ============= LIFE GOALS =============
// 16 common goals mapped to relevant Snapshots

export const LIFE_GOALS: LifeGoal[] = [
  // Break a Habit (6)
  {
    id: "stop-vaping",
    label: "Stop vaping/smoking",
    emoji: "🚭",
    category: "break-habit",
    relatedSnapshots: ["build-the-chain", "show-up-anyway", "one-day-at-time", "replace-the-trigger", "delay-the-impulse"],
    tagline: "Break the cycle, one day at a time"
  },
  {
    id: "drink-less",
    label: "Drink less alcohol",
    emoji: "🍷",
    category: "break-habit",
    relatedSnapshots: ["stabilize-basics", "replace-the-trigger", "back-to-zero", "protect-your-energy", "delay-the-impulse"],
    tagline: "Reclaim your evenings and energy"
  },
  {
    id: "stop-spending",
    label: "Stop impulse spending",
    emoji: "💸",
    category: "break-habit",
    relatedSnapshots: ["pause-before-reacting", "see-it-clearly", "word-equals-bond", "environment-reset", "delay-the-impulse"],
    tagline: "Build awareness before you buy"
  },
  {
    id: "less-screen",
    label: "Reduce screen time",
    emoji: "📱",
    category: "break-habit",
    relatedSnapshots: ["quiet-the-noise", "get-grounded", "protect-your-energy", "environment-reset", "urge-surfing"],
    tagline: "Take back your attention"
  },
  {
    id: "stop-stress-eating",
    label: "Stop stress eating",
    emoji: "🍔",
    category: "break-habit",
    relatedSnapshots: ["pause-before-reacting", "replace-the-trigger", "protect-your-energy", "see-it-clearly", "delay-the-impulse"],
    tagline: "Understand the urge, find a new response"
  },
  {
    id: "less-gaming",
    label: "Less gaming/scrolling",
    emoji: "🎮",
    category: "break-habit",
    relatedSnapshots: ["quiet-the-noise", "environment-reset", "urge-surfing", "one-thing-a-day", "what-actually-matters"],
    tagline: "Choose presence over escape"
  },

  // Build a Habit (6)
  {
    id: "exercise-more",
    label: "Move more",
    emoji: "🏃",
    category: "build-habit",
    relatedSnapshots: ["just-show-up", "tiny-wins", "build-the-chain", "back-to-basics", "consistency-over-intensity"],
    tagline: "Start small, show up daily"
  },
  {
    id: "sleep-better",
    label: "Sleep better",
    emoji: "😴",
    category: "build-habit",
    relatedSnapshots: ["stabilize-basics", "back-to-basics", "protect-your-energy", "rest-without-guilt", "take-care-first"],
    tagline: "Rest is the foundation"
  },
  {
    id: "eat-healthier",
    label: "Eat healthier",
    emoji: "🥗",
    category: "build-habit",
    relatedSnapshots: ["fuel-the-body", "stabilize-basics", "one-thing-a-day", "back-to-basics", "tiny-wins"],
    tagline: "Small food wins that stick"
  },
  {
    id: "drink-water",
    label: "Drink more water",
    emoji: "💧",
    category: "build-habit",
    relatedSnapshots: ["stabilize-basics", "build-the-chain", "tiny-wins", "back-to-basics", "one-thing-a-day"],
    tagline: "Simple hydration habit"
  },
  {
    id: "read-more",
    label: "Read more",
    emoji: "📖",
    category: "build-habit",
    relatedSnapshots: ["one-thing-a-day", "build-the-chain", "just-show-up", "quiet-the-noise", "consistency-over-intensity"],
    tagline: "A few pages a day"
  },
  {
    id: "meditate",
    label: "Meditate daily",
    emoji: "🧘",
    category: "build-habit",
    relatedSnapshots: ["quiet-the-noise", "just-show-up", "build-the-chain", "one-thing-a-day", "pause-before-reacting"],
    tagline: "Stillness as practice"
  },

  // Mindset Shifts (4)
  {
    id: "stop-procrastinating",
    label: "Stop procrastinating",
    emoji: "⏰",
    category: "mindset",
    relatedSnapshots: ["just-show-up", "finish-what-you-start", "tiny-wins", "do-what-you-said", "one-thing-a-day"],
    tagline: "Action over intention"
  },
  {
    id: "reduce-anxiety",
    label: "Reduce anxiety",
    emoji: "😰",
    category: "mindset",
    relatedSnapshots: ["quiet-the-noise", "pause-before-reacting", "zoom-out", "see-it-clearly", "one-day-at-time"],
    tagline: "Ground yourself in what you control"
  },
  {
    id: "stay-focused",
    label: "Stay focused",
    emoji: "🎯",
    category: "mindset",
    relatedSnapshots: ["one-thing-a-day", "what-actually-matters", "finish-what-you-start", "quiet-the-noise", "environment-reset"],
    tagline: "Cut through the noise"
  },
  {
    id: "better-relationships",
    label: "Better relationships",
    emoji: "💬",
    category: "mindset",
    relatedSnapshots: ["pause-before-reacting", "word-equals-bond", "keep-small-promises", "follow-through", "zoom-out"],
    tagline: "Show up for others by showing up for yourself"
  },
];

// ============= CATEGORY INFO =============

export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; emoji: string; description: string }> = {
  "break-habit": {
    label: "Break a Habit",
    emoji: "🚫",
    description: "Stop patterns that no longer serve you"
  },
  "build-habit": {
    label: "Build a Habit",
    emoji: "🌱",
    description: "Create new patterns that stick"
  },
  "mindset": {
    label: "Shift Mindset",
    emoji: "🧠",
    description: "Change how you see things"
  },
  "wellness": {
    label: "Improve Wellness",
    emoji: "❤️",
    description: "Take better care of yourself"
  }
};

// ============= HELPER FUNCTIONS =============

/**
 * Get all snapshots related to a specific goal
 */
export function getSnapshotsForGoal(goalId: string): string[] {
  const goal = LIFE_GOALS.find(g => g.id === goalId);
  return goal?.relatedSnapshots ?? [];
}

/**
 * Get all goals that reference a specific snapshot
 */
export function getGoalsForSnapshot(snapshotId: string): LifeGoal[] {
  return LIFE_GOALS.filter(goal => goal.relatedSnapshots.includes(snapshotId));
}

/**
 * Get goals filtered by category
 */
export function getGoalsByCategory(category: GoalCategory): LifeGoal[] {
  return LIFE_GOALS.filter(goal => goal.category === category);
}

/**
 * Get a specific goal by ID
 */
export function getGoalById(goalId: string): LifeGoal | undefined {
  return LIFE_GOALS.find(g => g.id === goalId);
}

/**
 * Get goal-specific context messaging
 */
export function getGoalContextMessage(goalId: string): string {
  const messages: Record<string, string> = {
    "stop-vaping": "This isn't about willpower. It's about understanding what the habit gives you, and finding other ways to get it. These Snapshots help you build awareness around triggers and replace automatic patterns.",
    "drink-less": "You don't need to quit forever—just take it one day at a time. These Snapshots help you understand what you're escaping from and build new evening rituals.",
    "stop-spending": "Impulse spending is often about the feeling, not the thing. These Snapshots help you pause, see clearly, and design your environment to reduce temptation.",
    "less-screen": "Your attention is precious. These Snapshots help you reclaim it by understanding what draws you in and creating space for presence.",
    "stop-stress-eating": "Stress eating is a signal, not a failure. These Snapshots help you notice the urge, understand the need, and find healthier responses.",
    "less-gaming": "It's not about never playing—it's about choosing when. These Snapshots help you create friction for autopilot and presence for intention.",
    "exercise-more": "Forget the gym. Just move. These Snapshots help you build the smallest possible habit that you can actually stick with.",
    "sleep-better": "Sleep is the foundation. These Snapshots help you protect your evenings, wind down properly, and give yourself permission to rest.",
    "eat-healthier": "Small food wins compound. These Snapshots help you add before you subtract, building sustainable eating patterns.",
    "drink-water": "The simplest habit with the biggest impact. These Snapshots help you chain hydration to existing routines.",
    "read-more": "A few pages a day beats a book a year. These Snapshots help you protect reading time and build consistency.",
    "meditate": "Even 2 minutes counts. These Snapshots help you show up for stillness without making it complicated.",
    "stop-procrastinating": "Procrastination is about feeling, not doing. These Snapshots help you start small and build momentum.",
    "reduce-anxiety": "Anxiety lives in the future. These Snapshots help you ground in today and focus on what you can control.",
    "stay-focused": "Focus isn't about doing more—it's about doing less. These Snapshots help you cut the noise and protect deep work.",
    "better-relationships": "You can only show up for others when you show up for yourself. These Snapshots help you keep promises and respond rather than react.",
  };
  return messages[goalId] || "These Snapshots are designed to help you make real progress on what matters to you.";
}
