// Guided Journeys - Fun 7-Day Habit Kickstarters
// Each journey has specific daily actions that guide users through the week

import type { UserBuildCurrent, BuildScore } from "./build";

export interface DailyAction {
  day: number;
  task: string;
  description: string;
}

export interface GuidedJourney {
  id: string;
  title: string;
  questTitle?: string; // Optional custom quest title (defaults to title)
  tagline: string;
  description: string;
  whatItHelps: string;
  dailyAction: string; // Generic action (used as fallback)
  dailyActions: DailyAction[]; // Specific actions for each day
  duration: number; // days
  emoji: string;
  isDefault?: boolean;
  isCustom?: boolean; // Generated from user's build data
}

// Get the quest title from a journey (uses questTitle if set, otherwise title)
export function getQuestTitleFromJourney(journey: GuidedJourney): string {
  return journey.questTitle || journey.title;
}

function getCustomJourneyById(id: string): GuidedJourney | undefined {
  if (!id.startsWith("custom-")) return undefined;
  const controllable = id.replace("custom-", "");
  const config = CUSTOM_FOCUS_CONFIG[controllable];
  if (!config) return undefined;
  return {
    id,
    title: config.title,
    tagline: config.tagline,
    description: config.description,
    whatItHelps: config.whatItHelps,
    dailyAction: config.dailyAction,
    dailyActions: config.dailyActions,
    duration: 7,
    emoji: config.emoji,
    isCustom: true,
  };
}

export const GUIDED_JOURNEYS: GuidedJourney[] = [
  {
    id: "happy-moves",
    title: "Happy Moves Week",
    tagline: "7 Days of Tiny Workouts & Big Joy",
    description: "From a living-room dance-off to a brisk walk around the block, each day's tiny move is designed to boost your mood and energy. No judgment or gym membership needed!",
    whatItHelps: "Low energy, sedentary routines, and movement avoidance",
    dailyAction: "Complete one tiny, joyful movement",
    dailyActions: [
      { day: 1, task: "5-minute dance party", description: "Put on your favorite song and dance like nobody's watching" },
      { day: 2, task: "Walk around the block", description: "A simple 10-minute stroll to get your blood flowing" },
      { day: 3, task: "Morning stretch routine", description: "Spend 5 minutes stretching when you wake up" },
      { day: 4, task: "Take the stairs today", description: "Skip the elevator and take the stairs wherever you go" },
      { day: 5, task: "Living room workout", description: "Do 10 jumping jacks, 10 squats, and 10 push-ups (any level!)" },
      { day: 6, task: "Walk & talk", description: "Take a phone call or listen to a podcast while walking" },
      { day: 7, task: "Celebration movement", description: "Pick any movement that made you smile this week and do it again!" },
    ],
    duration: 7,
    emoji: "🤸",
    isDefault: true,
  },
  {
    id: "colorful-plate",
    title: "Colorful Plate Week",
    tagline: "7 Days of Tasty, Healthy Fun",
    description: "Treat your taste buds to a little adventure in color and flavor. It's all about delicious wins, not dieting. By day 7, you'll be surprised how fun and flavorful healthy eating can be!",
    whatItHelps: "Mindless eating, low-nutrition habits, and food boredom",
    dailyAction: "Add one colorful, healthy element to your meals",
    dailyActions: [
      { day: 1, task: "Add a fruit to breakfast", description: "Berries, banana, or apple slices – make breakfast colorful" },
      { day: 2, task: "Swap soda for sparkling water", description: "Add a splash of juice or citrus for flavor" },
      { day: 3, task: "Sneak a veggie into lunch", description: "Add spinach to a sandwich, carrots as a side, or veggies in soup" },
      { day: 4, task: "Try a new healthy snack", description: "Hummus & veggies, mixed nuts, or Greek yogurt with honey" },
      { day: 5, task: "Cook one meal at home", description: "Make something simple with fresh ingredients" },
      { day: 6, task: "Drink 8 glasses of water", description: "Set reminders to stay hydrated throughout the day" },
      { day: 7, task: "Create a rainbow plate", description: "Make one meal with as many colors as possible!" },
    ],
    duration: 7,
    emoji: "🥗",
  },
  {
    id: "breathe-easy",
    title: "Breathe Easy Week",
    tagline: "7 Days of Fresh Air & Freedom",
    description: "Give your lungs a mini vacation this week. Each day, swap one negative habit for something that feels good. No pressure if it's hard – think of it as a 7-day experiment in feeling fresher and more free.",
    whatItHelps: "Breaking bad habits, stress relief, and building healthier coping mechanisms",
    dailyAction: "Replace one negative habit with a healthier alternative",
    dailyActions: [
      { day: 1, task: "Take 5 deep breaths instead", description: "When you feel an urge for a bad habit, pause and breathe deeply 5 times" },
      { day: 2, task: "Chew gum or eat a mint", description: "Keep your mouth busy with a healthier alternative" },
      { day: 3, task: "Take a 5-minute stroll", description: "Replace one break with a quick walk outside" },
      { day: 4, task: "Listen to a favorite song", description: "Use music to shift your mood instead of a negative habit" },
      { day: 5, task: "Drink water or tea", description: "Hydrate whenever you feel an urge to do something unhealthy" },
      { day: 6, task: "Call or text a friend", description: "Connect with someone instead of reaching for a bad habit" },
      { day: 7, task: "Celebrate your progress", description: "Reflect on the week – notice how much fresher you feel" },
    ],
    duration: 7,
    emoji: "🍃",
  },
  {
    id: "tiny-wins",
    title: "Tiny Wins Week",
    tagline: "7 Days of No-Pressure Progress",
    description: "We're flipping procrastination on its head – one tiny task at a time. Each day, pick one little thing you've been putting off and do it in just 5 minutes. No giant projects, no guilt – just quick wins!",
    whatItHelps: "Procrastination, overwhelm, and feeling stuck on to-do lists",
    dailyAction: "Complete one small task you've been avoiding",
    dailyActions: [
      { day: 1, task: "Send one email you've been avoiding", description: "Just press send – even a short reply counts!" },
      { day: 2, task: "Tidy one small space", description: "Your desk, one drawer, or the kitchen counter" },
      { day: 3, task: "Make one appointment", description: "Doctor, dentist, haircut – anything you've been putting off" },
      { day: 4, task: "Respond to one message", description: "That text or email you've been meaning to reply to" },
      { day: 5, task: "Organize one digital space", description: "5 minutes cleaning your inbox, desktop, or phone photos" },
      { day: 6, task: "Fix one small thing", description: "Replace a lightbulb, tighten a screw, or update a password" },
      { day: 7, task: "Complete any lingering task", description: "Pick the tiniest thing left on your list and check it off!" },
    ],
    duration: 7,
    emoji: "⚡",
  },
  {
    id: "pocket-change",
    title: "Pocket Change Adventure",
    tagline: "7 Days of Little Saves & Big Smiles",
    description: "Make saving money feel like a game this week. Each day, you'll tackle a fun mini-challenge. Every small save is a win to celebrate! By day 7, you'll notice your wallet feeling heavier and you feeling proud.",
    whatItHelps: "Overspending, impulse purchases, and building savings habits",
    dailyAction: "Find one creative way to save money",
    dailyActions: [
      { day: 1, task: "Skip one takeout coffee", description: "Make coffee at home and stash the $5 you saved" },
      { day: 2, task: "Pack your lunch", description: "Bring food from home instead of buying out" },
      { day: 3, task: "Find a free activity", description: "Go for a walk, visit a library, or have a game night at home" },
      { day: 4, task: "Unsubscribe from one service", description: "Cancel a streaming service or subscription you rarely use" },
      { day: 5, task: "Use a coupon or discount", description: "Find a deal before buying something you need" },
      { day: 6, task: "Cook dinner at home", description: "Make a simple, delicious meal instead of ordering out" },
      { day: 7, task: "Count your savings", description: "Add up what you saved this week and celebrate your progress!" },
    ],
    duration: 7,
    emoji: "💰",
  },
];

export const DEFAULT_JOURNEY_ID = "happy-moves";

export function getJourneyById(id: string): GuidedJourney | undefined {
  return GUIDED_JOURNEYS.find((j) => j.id === id) || getCustomJourneyById(id);
}

export function getDefaultJourney(): GuidedJourney {
  return GUIDED_JOURNEYS.find((j) => j.isDefault) || GUIDED_JOURNEYS[0];
}

// Get the daily action for a specific day of a journey
export function getJourneyDailyAction(journeyId: string, day: number): DailyAction | null {
  const journey = getJourneyById(journeyId);
  if (!journey) return null;
  return journey.dailyActions.find((a) => a.day === day) || null;
}

// Map journey to controllable focus (for internal tracking)
export function journeyToControllable(journeyId: string): string {
  if (journeyId.startsWith("custom-")) {
    return journeyId.replace("custom-", "");
  }
  const mapping: Record<string, string> = {
    "happy-moves": "wellness",
    "colorful-plate": "wellness",
    "breathe-easy": "habit",
    "tiny-wins": "habit",
    "pocket-change": "environment",
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
  dailyActions: DailyAction[];
  emoji: string;
}> = {
  awareness: {
    title: "Sharpen Your Awareness",
    tagline: "See more, react less",
    description: "Your awareness score suggests room for growth. This focus helps you catch patterns before they control you.",
    whatItHelps: "Reactive behavior, missed signals, and autopilot living",
    dailyAction: "Notice one trigger and pause before reacting",
    dailyActions: [
      { day: 1, task: "Notice 3 automatic reactions", description: "Observe when you react without thinking throughout the day" },
      { day: 2, task: "Take a 2-minute pause", description: "Before responding to something stressful, pause and breathe" },
      { day: 3, task: "Name your emotions", description: "When you feel something strong, label it: 'I'm feeling...'" },
      { day: 4, task: "Observe without judging", description: "Watch one situation unfold without forming opinions" },
      { day: 5, task: "Question one assumption", description: "Ask yourself: 'Is this really true?'" },
      { day: 6, task: "Practice active listening", description: "In one conversation, focus 100% on understanding" },
      { day: 7, task: "Reflect on your patterns", description: "What did you notice about yourself this week?" },
    ],
    emoji: "👁️",
  },
  perspective: {
    title: "Reclaim Your Perspective",
    tagline: "Zoom out, realign",
    description: "Your perspective needs attention. This focus helps you see the bigger picture and make better decisions.",
    whatItHelps: "Tunnel vision, reactive thinking, and lost priorities",
    dailyAction: "Ask yourself: will this matter in 30 days?",
    dailyActions: [
      { day: 1, task: "Ask: Will this matter in a year?", description: "Apply this question to one stressful situation" },
      { day: 2, task: "List 3 things you're grateful for", description: "Shift focus to what's working in your life" },
      { day: 3, task: "Zoom out on one problem", description: "Consider the bigger context before reacting" },
      { day: 4, task: "Read/watch something inspiring", description: "Consume content that expands your worldview" },
      { day: 5, task: "Talk to someone with different views", description: "Listen to understand, not to respond" },
      { day: 6, task: "Let go of one grudge", description: "Choose to release resentment about something small" },
      { day: 7, task: "Write your future self a note", description: "What do you want to remember about this week?" },
    ],
    emoji: "🔭",
  },
  habit: {
    title: "Rebuild Your Habits",
    tagline: "Show up, stack wins",
    description: "Your habit consistency is flagging. This focus helps you show up reliably without relying on motivation.",
    whatItHelps: "Inconsistency, broken streaks, and starting over",
    dailyAction: "Complete one non-negotiable rep, no matter how small",
    dailyActions: [
      { day: 1, task: "Do 2 minutes of your habit", description: "Make it so easy you can't say no" },
      { day: 2, task: "Stack it on an existing habit", description: "After I [existing habit], I will [new habit]" },
      { day: 3, task: "Prepare your environment", description: "Set up visual cues to remind you" },
      { day: 4, task: "Track your habit visibly", description: "Check off today's rep on a calendar or app" },
      { day: 5, task: "Never miss twice", description: "If you slipped yesterday, get back on track today" },
      { day: 6, task: "Reward yourself immediately", description: "Celebrate completing your habit in some small way" },
      { day: 7, task: "Plan your week ahead", description: "Schedule when and where you'll do your habit next week" },
    ],
    emoji: "🔧",
  },
  wellness: {
    title: "Restore Your Foundation",
    tagline: "Energy first, output second",
    description: "Your wellness is the bottleneck. This focus prioritizes the basics that fuel everything else.",
    whatItHelps: "Low energy, burnout, and depleted reserves",
    dailyAction: "Prioritize one wellness basic: sleep, move, or eat well",
    dailyActions: [
      { day: 1, task: "Go to bed 30 minutes earlier", description: "Start with better sleep as your foundation" },
      { day: 2, task: "Take a 15-minute walk", description: "Simple movement to boost energy and mood" },
      { day: 3, task: "Eat one extra serving of vegetables", description: "Add color and nutrients to one meal" },
      { day: 4, task: "Drink water before coffee", description: "Start your day with hydration" },
      { day: 5, task: "Take a screen-free break", description: "15 minutes of rest for your eyes and mind" },
      { day: 6, task: "Stretch for 5 minutes", description: "Release tension in your body before bed" },
      { day: 7, task: "Plan one wellness win for next week", description: "Which basic will you continue prioritizing?" },
    ],
    emoji: "🔋",
  },
  environment: {
    title: "Design Your Environment",
    tagline: "Remove friction, add flow",
    description: "Your environment is working against you. This focus helps you shape your space to support your goals.",
    whatItHelps: "Distractions, friction, and willpower drain",
    dailyAction: "Remove one obstacle or prep one thing for tomorrow",
    dailyActions: [
      { day: 1, task: "Remove one distraction", description: "Put your phone in another room, hide the remote, etc." },
      { day: 2, task: "Prep one thing for tomorrow", description: "Lay out clothes, pack your bag, or set up your workspace" },
      { day: 3, task: "Clear one cluttered surface", description: "A clean desk or counter reduces mental noise" },
      { day: 4, task: "Create a visual cue", description: "Put a reminder where you'll see it (book on pillow, etc.)" },
      { day: 5, task: "Optimize one routine path", description: "Make the good choice the easy choice" },
      { day: 6, task: "Set up a 'focus zone'", description: "Designate one space for deep work or relaxation" },
      { day: 7, task: "Reflect on your environment", description: "What changes made the biggest difference this week?" },
    ],
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
    dailyActions: config.dailyActions,
    duration: 7,
    emoji: config.emoji,
    isCustom: true,
  };
}

// Get journey ID for a custom focus (maps back to the standard journey for storage)
export function getStandardJourneyForCustom(customJourneyId: string): string {
  const controllable = customJourneyId.replace("custom-", "");
  const mapping: Record<string, string> = {
    awareness: "breathe-easy",
    perspective: "tiny-wins",
    habit: "tiny-wins",
    wellness: "happy-moves",
    environment: "pocket-change",
  };
  return mapping[controllable] || "happy-moves";
}
