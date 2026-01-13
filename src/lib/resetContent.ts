// The 7-Day Reset content structure
// New: Quest-based themes for re-entry experience

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
  // Quest-based daily actions
  questAction: string;
  integrityRep: string;
  reflection: string;
  reading: {
    source: string;
    chapter: string;
    text: string;
  };
}

export const RESET_DAYS: DayContent[] = [
  {
    day: 1,
    controllable: "Choose Your Quest",
    emoji: "🎯",
    framingLine: "If you don't choose, life chooses for you.",
    prompt: "What's the one thing that matters most right now?",
    inputType: "text",
    completionButtonText: "Quest Chosen",
    controlLine: "Today, I control my direction.",
    surrenderLine: "I release the need to control the outcome.",
    questAction: "Define or recommit to your Main Quest",
    integrityRep: "Make one small promise you can keep today",
    reflection: "What happens if you don't choose?",
    reading: {
      source: "The Controllables",
      chapter: "The Quest",
      text: "Without a chosen quest, you're an NPC in someone else's game. The default path isn't wrong—it's just not yours. Every hero's journey starts with a choice to leave the ordinary world.",
    },
  },
  {
    day: 2,
    controllable: "Clean the Environment",
    emoji: "🧹",
    framingLine: "Your space shapes your state.",
    prompt: "What in your environment drains your energy?",
    inputType: "text",
    completionButtonText: "Space Cleared",
    controlLine: "Today, I control my inputs.",
    surrenderLine: "I release attachment to clutter.",
    questAction: "Clear one physical or digital space",
    integrityRep: "Delete or unfollow one thing that doesn't serve you",
    reflection: "How does your environment affect your momentum?",
    reading: {
      source: "The Controllables",
      chapter: "Environment",
      text: "A rocket needs escape velocity to break free from gravity. Your environment is the gravity in your life. Some people fuel your launch. Others hold you to the ground. The same is true for spaces, objects, and inputs.",
    },
  },
  {
    day: 3,
    controllable: "Keep One Promise",
    emoji: "🤝",
    framingLine: "Confidence comes from kept promises.",
    prompt: "What's one promise you've made that you haven't kept?",
    inputType: "text",
    completionButtonText: "Promise Made",
    controlLine: "Today, I control my word.",
    surrenderLine: "I release over-commitment.",
    questAction: "Complete one thing you've been putting off",
    integrityRep: "Make only one new promise—and keep it",
    reflection: "What would life look like with 100% integrity?",
    reading: {
      source: "The Controllables",
      chapter: "Integrity",
      text: "Your word is your currency. Every broken promise devalues it. Every kept promise compounds. You don't need more confidence—you need more evidence that you do what you say.",
    },
  },
  {
    day: 4,
    controllable: "Time Awareness",
    emoji: "⏳",
    framingLine: "Time is the only non-renewable resource.",
    prompt: "Where does your time go without intention?",
    inputType: "text",
    completionButtonText: "Time Tracked",
    controlLine: "Today, I control what I give my time to.",
    surrenderLine: "I release guilt about past time spent.",
    questAction: "Log how you spend your waking hours",
    integrityRep: "Protect one hour for your Main Quest",
    reflection: "What would you do differently if time was money?",
    reading: {
      source: "The Controllables",
      chapter: "Time Currency",
      text: "You can't save time. You can only spend it. The question isn't 'how much time do I have?' but 'what am I buying with it?' Every hour traded for scrolling is an hour not invested in the quest.",
    },
  },
  {
    day: 5,
    controllable: "Reps Over Motivation",
    emoji: "🦈",
    framingLine: "Motion matters more than magnitude.",
    prompt: "What small action have you been waiting to feel ready for?",
    inputType: "text",
    completionButtonText: "Rep Complete",
    controlLine: "Today, I control whether I start.",
    surrenderLine: "I release the need to feel motivated.",
    questAction: "Do one rep toward your quest—no matter how small",
    integrityRep: "Move your body for at least 5 minutes",
    reflection: "What if motivation follows action, not the other way around?",
    reading: {
      source: "The Controllables",
      chapter: "Habit",
      text: "Sharks can't stop moving or they die. But they don't swim fast—they swim constantly. Your habits don't need to be heroic. They need to be happening. One rep. That's all it takes to stay alive.",
    },
  },
  {
    day: 6,
    controllable: "Respec Check",
    emoji: "🔄",
    framingLine: "You're allowed to change direction.",
    prompt: "Is your current approach working? Be honest.",
    inputType: "text",
    completionButtonText: "Build Reviewed",
    controlLine: "Today, I control my strategy.",
    surrenderLine: "I release attachment to the old way.",
    questAction: "Evaluate your approach—adjust if needed",
    integrityRep: "Ask for feedback from someone you trust",
    reflection: "What would you try if you weren't afraid of wasting past effort?",
    reading: {
      source: "The Controllables",
      chapter: "The Respec",
      text: "Sunk cost is not spent energy—it's released energy. Every moment you stay on the wrong path because of past investment is a moment stolen from the right path. Respecs aren't failure. They're wisdom.",
    },
  },
  {
    day: 7,
    controllable: "Define the Win",
    emoji: "🏁",
    framingLine: "You decide what winning means.",
    prompt: "What does victory look like for your current quest?",
    inputType: "text",
    completionButtonText: "Win Condition Set",
    controlLine: "Today, I control my definition of success.",
    surrenderLine: "I release other people's definitions.",
    questAction: "Write down your win condition—be specific",
    integrityRep: "Celebrate one thing you've done this week",
    reflection: "What will you feel when you complete this quest?",
    reading: {
      source: "The Controllables",
      chapter: "The Win Condition",
      text: "Status symbols do not equal progress. The finish line is wherever you plant the flag. If you don't define the win, you'll chase someone else's trophy forever. This is your game. You set the rules.",
    },
  },
];

export const getDayContent = (dayNumber: number): DayContent => {
  return RESET_DAYS[dayNumber - 1] || RESET_DAYS[0];
};

// Missed day message - no shame, just facts
export const MISSED_DAY_MESSAGE = "You didn't lose progress. You paused the quest. Ready to resume?";

// Covenant text - updated for quest-based framing
export const COVENANT_TEXT = `Life is a game. You can play it on purpose, or let the default path play you.

This 7-day reset will help you:
• Choose or recommit to your Main Quest
• Build momentum through reps, not motivation
• Track integrity—promises made vs kept
• Use time as currency, not background noise

I choose to play intentionally.`;

export const COVENANT_CHECKBOX_TEXT = "I commit to showing up for 7 days. Not perfectly. Just presently.";
