// Badge definitions for V1 - Philosophy-driven, not gamified
// Badges mark meaningful moments, not counts or streaks

export type BadgeKey = 
  | "chose_quest"
  | "returned"
  | "kept_promise"
  | "respecd"
  | "paused_reacting"
  | "completed_reset"
  | "protected_time"
  | "asked_guidance"
  | "foundation_explorer"
  | "foundation_streak_2"
  | "foundation_streak_3"
  | "foundation_streak_5";

export interface Badge {
  key: BadgeKey;
  emoji: string;
  name: string;
  meaning: string;
  trigger: string;
}

export const BADGES: Record<BadgeKey, Badge> = {
  chose_quest: {
    key: "chose_quest",
    emoji: "🧭",
    name: "Chose a Quest",
    meaning: "You chose direction instead of drifting.",
    trigger: "First main quest created",
  },
  returned: {
    key: "returned",
    emoji: "🔄",
    name: "Returned",
    meaning: "Coming back counts.",
    trigger: "Activity after 48+ hours inactivity",
  },
  kept_promise: {
    key: "kept_promise",
    emoji: "🧱",
    name: "Kept a Promise",
    meaning: "Trust is built one promise at a time.",
    trigger: "First promise marked as kept",
  },
  respecd: {
    key: "respecd",
    emoji: "🛠️",
    name: "Respec'd",
    meaning: "Changing strategy is strength.",
    trigger: "Quest or approach intentionally adjusted",
  },
  paused_reacting: {
    key: "paused_reacting",
    emoji: "🧘",
    name: "Paused Before Reacting",
    meaning: "You responded instead of reacting.",
    trigger: "Completed an Awareness operator action",
  },
  completed_reset: {
    key: "completed_reset",
    emoji: "🌱",
    name: "Completed a Reset",
    meaning: "You know how to restart.",
    trigger: "All 7 days of a Reset completed",
  },
  protected_time: {
    key: "protected_time",
    emoji: "⏳",
    name: "Protected My Time",
    meaning: "Your time is intentional.",
    trigger: "3+ time logs within a 7-day window",
  },
  asked_guidance: {
    key: "asked_guidance",
    emoji: "🧠",
    name: "Asked for Guidance",
    meaning: "You didn't carry this alone.",
    trigger: "Engaged with 3+ different Controllables",
  },
  foundation_explorer: {
    key: "foundation_explorer",
    emoji: "🎓",
    name: "Foundation Explorer",
    meaning: "You learned the tools to build your life.",
    trigger: "Completed the Welcome 7-Day Foundation",
  },
  foundation_streak_2: {
    key: "foundation_streak_2",
    emoji: "🔥",
    name: "Double Down",
    meaning: "Two foundations. Real momentum.",
    trigger: "Completed 2 consecutive Foundations",
  },
  foundation_streak_3: {
    key: "foundation_streak_3",
    emoji: "⚡",
    name: "Triple Threat",
    meaning: "Three foundations. You're building something.",
    trigger: "Completed 3 consecutive Foundations",
  },
  foundation_streak_5: {
    key: "foundation_streak_5",
    emoji: "🏆",
    name: "Foundation Master",
    meaning: "Five foundations. You've proven consistency.",
    trigger: "Completed 5 consecutive Foundations",
  },
};

// Return badge by key
export const getBadge = (key: BadgeKey): Badge => BADGES[key];

// Get all badge keys
export const getAllBadgeKeys = (): BadgeKey[] => Object.keys(BADGES) as BadgeKey[];
