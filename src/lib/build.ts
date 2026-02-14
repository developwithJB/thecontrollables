export type ArchetypeTheme = "stable" | "rebuild" | "warning" | "danger" | "neutral";

export type ArchetypeInfo = {
  label: string;
  description: string;
  emoji: string;
  theme: ArchetypeTheme;
  recommendations: string[];
};

export const ARCHETYPE_LABELS: Record<string, ArchetypeInfo> = {
  // Stable / positive states
  stable_build: {
    label: "Stable Build",
    emoji: "⚡",
    theme: "stable",
    description: "All systems functioning well. Maintain and optimize.",
    recommendations: [
      "Maintain your rhythm—don't add unnecessary complexity.",
      "Use your stability to help others or mentor.",
      "Experiment with optimization in one controllable.",
    ],
  },
  strong_foundation: {
    label: "Strong Foundation",
    emoji: "🏔️",
    theme: "stable",
    description: "Your base is solid. Now layer in awareness and habits.",
    recommendations: [
      "Add one awareness practice to your morning.",
      "Stack a small habit onto your existing routine.",
      "Review your perspective: what's the next level?",
    ],
  },

  // Rebuild / recovery states
  momentum_rebooting: {
    label: "Momentum Rebooting",
    emoji: "🔄",
    theme: "rebuild",
    description: "The engine is restarting. Protect small wins and keep reps small.",
    recommendations: [
      "Pick one rep you can do even on a bad day.",
      "Reduce goals by 50% for 7 days.",
      "Win the morning with one clean action.",
    ],
  },
  capable_but_inconsistent: {
    label: "Capable but Inconsistent",
    emoji: "🎯",
    theme: "rebuild",
    description: "Good energy, but missing reps. Focus on showing up daily.",
    recommendations: [
      "Set one non-negotiable daily action.",
      "Use a visible tracker for 7 days.",
      "Shrink the rep until you can't say no.",
    ],
  },
  scattered_focus: {
    label: "Scattered Focus",
    emoji: "🌀",
    theme: "rebuild",
    description: "High clarity but struggling to execute. Simplify your daily system.",
    recommendations: [
      "Pick ONE habit to focus on for the next 7 days.",
      "Remove 3 distractions from your environment.",
      "Set a daily 'execution window' with no decisions.",
    ],
  },

  // Warning states
  driven_but_depleting: {
    label: "Driven but Depleting",
    emoji: "⚠️",
    theme: "warning",
    description: "Strong on habits, but running low on energy. Prioritize recovery.",
    recommendations: [
      "Schedule one recovery block daily (walk, nap, breathe).",
      "Reduce habit intensity by 20% this week.",
      "Check your sleep and nutrition basics.",
    ],
  },
  low_battery_mode: {
    label: "Low Battery Mode",
    emoji: "🔋",
    theme: "warning",
    description: "Energy is the bottleneck. Recovery first, then output.",
    recommendations: [
      "Prioritize sleep and a short walk today.",
      "Lower intensity, increase consistency.",
      "Remove one draining commitment this week.",
    ],
  },
  tunnel_vision: {
    label: "Tunnel Vision",
    emoji: "🏁",
    theme: "warning",
    description: "You are moving fast. Lift your head and re-aim.",
    recommendations: [
      "Write one sentence: what is the real goal?",
      "Zoom out: what matters in 30 days?",
      "Schedule one reflection block this week.",
    ],
  },
  clear_but_fighting_friction: {
    label: "Clear but Fighting Friction",
    emoji: "🧲",
    theme: "warning",
    description: "High awareness, but your environment works against you. Redesign your surroundings.",
    recommendations: [
      "Remove one distraction from your physical space.",
      "Prep your next rep so it's one tap away.",
      "Create one no-decision zone for 30 minutes daily.",
    ],
  },

  // Danger states
  overclocked: {
    label: "Overclocked",
    emoji: "🔥",
    theme: "danger",
    description: "Output is high but recovery is behind. Crash risk rising.",
    recommendations: [
      "Add a daily recovery block.",
      "Cut volume 20% for a week.",
      "Fuel basics: water, protein, sleep.",
    ],
  },
  high_friction_zone: {
    label: "High Friction Zone",
    emoji: "🧲",
    theme: "danger",
    description: "Your environment is working against you. Fix the room first.",
    recommendations: [
      "Remove one distraction from your space.",
      "Prep your next rep so it's one tap away.",
      "Create one no-decision zone for 30 minutes daily.",
    ],
  },
  grind_mode: {
    label: "Grind Mode",
    emoji: "⚙️",
    theme: "warning",
    description: "Executing relentlessly but losing the bigger picture. Pause to reflect.",
    recommendations: [
      "Block 15 minutes for weekly reflection.",
      "Ask: is this the right hill?",
      "Talk to someone outside your daily loop.",
    ],
  },

  // Fallback / neutral
  unmapped_pattern: {
    label: "Unique Pattern",
    emoji: "🧭",
    theme: "neutral",
    description: "Your build is uniquely balanced. Focus on the area that feels most important to you right now.",
    recommendations: [
      "Focus on the lowest controllable for 7 days.",
      "Do one rep daily, no upgrades.",
      "Clean up one source of friction.",
    ],
  },
};

// Theme color mappings for UI styling
export const ARCHETYPE_THEME_COLORS: Record<ArchetypeTheme, {
  bg: string;
  border: string;
  text: string;
  chip: string;
}> = {
  stable: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  rebuild: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    chip: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  danger: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    chip: "bg-red-500/20 text-red-700 dark:text-red-300",
  },
  neutral: {
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
  },
};

export function getArchetypeInfo(key: string | null): ArchetypeInfo {
  if (!key) return ARCHETYPE_LABELS.unmapped_pattern;
  return ARCHETYPE_LABELS[key] || ARCHETYPE_LABELS.unmapped_pattern;
}

export function getArchetypeThemeColors(key: string | null) {
  const info = getArchetypeInfo(key);
  return ARCHETYPE_THEME_COLORS[info.theme];
}

export interface BuildQuestion {
  id: string;
  controllable: string;
  question_key: string;
  prompt: string;
  order_index: number;
}

export interface UserBuildCurrent {
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string | null;
  last_assessment_id: string | null;
  updated_at: string;
}

export interface BuildScore {
  id: string;
  assessment_id: string;
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string;
  computed_at: string;
}

// Focus mode types
export interface FocusPlan {
  controllable: string;
  days: FocusPlanDay[];
}

export interface FocusPlanDay {
  day: number;
  intention: string;
  rep: string;
  surrender: string;
}

// Generate a 7-day focus plan for a controllable
export function generateFocusPlan(controllable: string): FocusPlan {
  const plans: Record<string, FocusPlanDay[]> = {
    awareness: [
      { day: 1, intention: "Notice one trigger today.", rep: "Write down the first distraction you catch.", surrender: "I cannot control every thought, only my response." },
      { day: 2, intention: "Observe without judgment.", rep: "Set 3 mindfulness alarms for quick check-ins.", surrender: "Awareness grows in patience, not force." },
      { day: 3, intention: "Name the emotion before reacting.", rep: "Pause 3 seconds before responding to friction.", surrender: "I release the need to fix everything instantly." },
      { day: 4, intention: "Track your attention leaks.", rep: "Note where your focus drifted 3 times today.", surrender: "Distraction is data, not defeat." },
      { day: 5, intention: "Choose one focal point.", rep: "Single-task for 25 minutes.", surrender: "I trust that one thing done well is enough." },
      { day: 6, intention: "Reflect on the week's patterns.", rep: "Review your notes and find one theme.", surrender: "Progress hides in patterns I haven't seen yet." },
      { day: 7, intention: "Celebrate awareness gains.", rep: "Share one insight with someone.", surrender: "I am building a mind that sees more clearly." },
    ],
    perspective: [
      { day: 1, intention: "Zoom out on one problem.", rep: "Ask: will this matter in 30 days?", surrender: "I cannot control outcomes, only my lens." },
      { day: 2, intention: "Seek a different viewpoint.", rep: "Ask someone how they see the situation.", surrender: "My perspective is partial, and that's okay." },
      { day: 3, intention: "Reframe one frustration.", rep: "Write: 'What if this is happening for me?'", surrender: "I release the need to be right." },
      { day: 4, intention: "Focus on what you can control.", rep: "List 3 things in your control today.", surrender: "I surrender what I cannot change." },
      { day: 5, intention: "Practice gratitude.", rep: "Name 3 things working in your favor.", surrender: "There is more going right than wrong." },
      { day: 6, intention: "Check your story.", rep: "Identify one assumption you're making.", surrender: "I am not my thoughts; I am the observer." },
      { day: 7, intention: "Reset your frame.", rep: "Write your ideal mindset for next week.", surrender: "I choose how I see the world." },
    ],
    habit: [
      { day: 1, intention: "Show up, no matter how small.", rep: "Do 1 minute of your target habit.", surrender: "I cannot control motivation, only showing up." },
      { day: 2, intention: "Stack onto an existing routine.", rep: "Attach your habit to something automatic.", surrender: "I trust the process more than the outcome." },
      { day: 3, intention: "Remove one friction point.", rep: "Make your habit 10% easier to start.", surrender: "Ease is not weakness; it's wisdom." },
      { day: 4, intention: "Track the streak, not perfection.", rep: "Mark today's rep done, however small.", surrender: "Progress is not linear." },
      { day: 5, intention: "Protect your habit window.", rep: "Block time and defend it.", surrender: "I release the guilt of imperfect days." },
      { day: 6, intention: "Reflect on what's working.", rep: "Note one thing that made habits easier.", surrender: "Small wins compound beyond my sight." },
      { day: 7, intention: "Commit to the next 7 days.", rep: "Write your habit intention for next week.", surrender: "I am building identity, not just behavior." },
    ],
    wellness: [
      { day: 1, intention: "Prioritize sleep tonight.", rep: "Set a wind-down alarm 30 min before bed.", surrender: "I cannot hustle my way to health." },
      { day: 2, intention: "Move for 10 minutes.", rep: "Walk, stretch, or dance—just move.", surrender: "My body knows what it needs; I listen." },
      { day: 3, intention: "Hydrate intentionally.", rep: "Drink water before every meal.", surrender: "I release the myth that rest is laziness." },
      { day: 4, intention: "Eat one clean meal.", rep: "Choose whole foods for one meal today.", surrender: "Fuel is medicine, not reward." },
      { day: 5, intention: "Rest without guilt.", rep: "Take a 15-minute break with no screens.", surrender: "I am worthy of rest." },
      { day: 6, intention: "Check your energy sources.", rep: "Note what drained and what restored you.", surrender: "I protect my energy as a sacred resource." },
      { day: 7, intention: "Plan for sustainable wellness.", rep: "Schedule one wellness action for next week.", surrender: "I build health in reps, not overhauls." },
    ],
    environment: [
      { day: 1, intention: "Remove one distraction.", rep: "Clear one surface or close one tab.", surrender: "I cannot control chaos, only my corner." },
      { day: 2, intention: "Prep for tomorrow.", rep: "Set out what you need for your next rep.", surrender: "Environment shapes behavior more than willpower." },
      { day: 3, intention: "Create a no-decision zone.", rep: "Automate one daily choice.", surrender: "I release the need to optimize everything." },
      { day: 4, intention: "Reduce inputs.", rep: "Unsubscribe from one email or notification.", surrender: "Less noise, more signal." },
      { day: 5, intention: "Design for your future self.", rep: "Make the right choice the easy choice.", surrender: "I trust my environment to support me." },
      { day: 6, intention: "Audit your triggers.", rep: "Identify one environmental trigger for bad habits.", surrender: "Friction is a gift I can design." },
      { day: 7, intention: "Lock in one environment win.", rep: "Make one change permanent.", surrender: "I build spaces that build me." },
    ],
  };

  return {
    controllable,
    days: plans[controllable] || plans.awareness,
  };
}

// Get the lowest controllable from a build
export function getLowestControllable(build: UserBuildCurrent): string {
  const scores = {
    awareness: build.awareness,
    perspective: build.perspective,
    habit: build.habit,
    wellness: build.wellness,
    environment: build.environment,
  };

  let lowest = "awareness";
  let lowestScore = scores.awareness;

  for (const [key, value] of Object.entries(scores)) {
    if (value < lowestScore) {
      lowest = key;
      lowestScore = value;
    }
  }

  return lowest;
}
