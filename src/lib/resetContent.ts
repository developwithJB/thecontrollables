// The 7-Day Reset content structure
// Each day focuses on one Controllable with two lenses: control + surrender

export interface DayContent {
  day: number;
  controllable: string;
  emoji: string;
  framingLine: string;
  prompt: string;
  inputType: "text" | "tap_choice" | "rating_1_5";
  completionButtonText: string;
  surrenderLine: string;
  controlLine: string;
  reading: {
    source: string;
    chapter: string;
    text: string;
  };
}

export const RESET_DAYS: DayContent[] = [
  {
    day: 1,
    controllable: "Awareness",
    emoji: "🦉",
    framingLine: "Before you can change anything, you have to see it.",
    prompt: "What's one thing you've been avoiding looking at honestly?",
    inputType: "text",
    completionButtonText: "I See It",
    controlLine: "Today, I control my attention.",
    surrenderLine: "I release the need to have all the answers.",
    reading: {
      source: "The Controllables",
      chapter: "Awareness",
      text: "The owl doesn't hunt by chasing. It sits. It watches. It waits until the moment reveals itself. Awareness isn't about seeing more—it's about seeing what matters.",
    },
  },
  {
    day: 2,
    controllable: "Perspective",
    emoji: "🐢",
    framingLine: "Speed creates blindness. Stillness creates sight.",
    prompt: "What situation are you rushing to react to?",
    inputType: "text",
    completionButtonText: "I Choose to Pause",
    controlLine: "Today, I control my response time.",
    surrenderLine: "I release the urgency to fix everything now.",
    reading: {
      source: "The Controllables",
      chapter: "Perspective",
      text: "The turtle carries its home. It doesn't rush because it has everything it needs. When you slow down, you stop reacting to life and start responding to it.",
    },
  },
  {
    day: 3,
    controllable: "Habit",
    emoji: "🦈",
    framingLine: "Motion matters more than magnitude.",
    prompt: "What small action have you been putting off?",
    inputType: "text",
    completionButtonText: "I Will Move",
    controlLine: "Today, I control whether I start.",
    surrenderLine: "I release perfectionism about how it gets done.",
    reading: {
      source: "The Controllables",
      chapter: "Habit",
      text: "Sharks can't stop moving or they die. But they don't swim fast—they swim constantly. Your habits don't need to be heroic. They need to be happening.",
    },
  },
  {
    day: 4,
    controllable: "Wellness",
    emoji: "🛰️",
    framingLine: "Your body keeps score. Check the signal.",
    prompt: "How is your body feeling right now? (1 = depleted, 5 = charged)",
    inputType: "rating_1_5",
    completionButtonText: "I Hear My Body",
    controlLine: "Today, I control how I treat my body.",
    surrenderLine: "I release guilt about needing rest.",
    reading: {
      source: "The Controllables",
      chapter: "Wellness",
      text: "A satellite orbiting Earth can detect a one-degree temperature shift from space. Your body is always sending signals. The question is whether you're listening.",
    },
  },
  {
    day: 5,
    controllable: "Environment",
    emoji: "🚀",
    framingLine: "You become who you're around.",
    prompt: "Who in your life lifts you up?",
    inputType: "text",
    completionButtonText: "I Choose My Circle",
    controlLine: "Today, I control who I give my time to.",
    surrenderLine: "I release toxic expectations from others.",
    reading: {
      source: "The Controllables",
      chapter: "Environment",
      text: "A rocket needs escape velocity to break free from gravity. Your environment is the gravity in your life. Some people fuel your launch. Others hold you to the ground.",
    },
  },
  {
    day: 6,
    controllable: "Ego Scanner",
    emoji: "👺",
    framingLine: "The loudest voice in your head isn't always telling the truth.",
    prompt: "What story is your ego telling you right now?",
    inputType: "text",
    completionButtonText: "I See Through It",
    controlLine: "Today, I control what I believe about myself.",
    surrenderLine: "I release the need to be right.",
    reading: {
      source: "The Controllables",
      chapter: "Ego Scanner",
      text: "The mask looks convincing from outside, but it's hollow inside. Your ego wears many masks—victim, hero, critic. Learning to spot them is how you take back control.",
    },
  },
  {
    day: 7,
    controllable: "Review",
    emoji: "⚡",
    framingLine: "Seven days of showing up. That's the work.",
    prompt: "What has shifted in you this week?",
    inputType: "text",
    completionButtonText: "I Complete This Journey",
    controlLine: "Today, I control whether I carry this forward.",
    surrenderLine: "I give the rest to God.",
    reading: {
      source: "The Controllables",
      chapter: "The Review",
      text: "Lightning doesn't strike randomly—it follows the path of least resistance carved by previous strikes. Each day you showed up, you carved a new path. That's how transformation works.",
    },
  },
];

export const getDayContent = (dayNumber: number): DayContent => {
  return RESET_DAYS[dayNumber - 1] || RESET_DAYS[0];
};

// Missed day message
export const MISSED_DAY_MESSAGE = "Welcome back. Some days slip. Control what you can today and give the rest to God.";

// Covenant text
export const COVENANT_TEXT = `Life is full of things we cannot control. Outcomes, other people, sickness, timing. Those belong to God.

What we CAN control is how we show up. Today, I choose to control what I can and give the rest to God.`;

export const COVENANT_CHECKBOX_TEXT = "I choose to control what I can and give the rest to God.";
