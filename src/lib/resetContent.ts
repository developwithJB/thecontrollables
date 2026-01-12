// The 7-Day Reset content structure
// Each day focuses on one Controllable with emotional resonance

export interface DayContent {
  day: number;
  controllable: string;
  emoji: string;
  theme: string;
  reflectionQuestion: string;
  suggestedCommitment: string;
  releasePrompt: string;
}

export const RESET_DAYS: DayContent[] = [
  {
    day: 1,
    controllable: "Awareness",
    emoji: "🦉",
    theme: "See Clearly",
    reflectionQuestion: "What's one thing you've been avoiding looking at honestly?",
    suggestedCommitment: "I will acknowledge one truth today.",
    releasePrompt: "I release the need to have all the answers.",
  },
  {
    day: 2,
    controllable: "Perspective",
    emoji: "🐢",
    theme: "The Pause",
    reflectionQuestion: "What situation are you rushing to react to?",
    suggestedCommitment: "I will pause before responding once today.",
    releasePrompt: "I release the urgency to fix everything now.",
  },
  {
    day: 3,
    controllable: "Habit",
    emoji: "🦈",
    theme: "Keep Moving",
    reflectionQuestion: "What small action have you been putting off?",
    suggestedCommitment: "I will complete one small task today.",
    releasePrompt: "I release perfectionism about how it gets done.",
  },
  {
    day: 4,
    controllable: "Wellness",
    emoji: "🛰️",
    theme: "Battery Check",
    reflectionQuestion: "How are you really feeling today? (Body, mind, spirit)",
    suggestedCommitment: "I will honor my energy level today.",
    releasePrompt: "I release guilt about needing rest.",
  },
  {
    day: 5,
    controllable: "Environment",
    emoji: "🚀",
    theme: "Your People",
    reflectionQuestion: "Who in your life lifts you up?",
    suggestedCommitment: "I will reach out to one positive person today.",
    releasePrompt: "I release toxic expectations from others.",
  },
  {
    day: 6,
    controllable: "Ego",
    emoji: "👺",
    theme: "The Lies",
    reflectionQuestion: "What story is your ego telling you right now?",
    suggestedCommitment: "I will catch one ego lie today.",
    releasePrompt: "I release the need to be right.",
  },
  {
    day: 7,
    controllable: "Integration",
    emoji: "⚡",
    theme: "Full Charge",
    reflectionQuestion: "What has shifted in you this week?",
    suggestedCommitment: "I will carry one lesson forward.",
    releasePrompt: "I give the rest to God.",
  },
];

export const getDayContent = (dayNumber: number): DayContent => {
  return RESET_DAYS[dayNumber - 1] || RESET_DAYS[0];
};
