// The 7-Day Controllables Reset content structure

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
    controllable: "Awareness",
    emoji: "🦉",
    framingLine: "Name What Is True",
    prompt: "What is true right now that you usually ignore?",
    inputType: "text",
    completionButtonText: "Truth Named",
    controlLine: "Today, I control my attention.",
    surrenderLine: "Release the need to control everything today. Give what is not yours back to God.",
    questAction: "Pause once today before reacting. Name what is actually true.",
    integrityRep: "Notice one automatic thought without acting on it.",
    reflection: "What changes when you tell the truth before you react?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 1 – The Dashboard: A New Beginning (Pages 6–13)",
      text: "You are not broken. You are not behind. You are simply aware now.\n\nMost people live inside reactions without ever seeing the controls. Awareness is the moment you realize you are not your thoughts. You are the one noticing them.\n\nThis is your Dashboard. Not to control everything, but to see clearly.\n\nYou are a spiritual being operating a human body. Awareness is remembering you have choice.",
    },
  },
  {
    day: 2,
    controllable: "Perspective",
    emoji: "🐢",
    framingLine: "Reframe the Story",
    prompt: "What story are you telling yourself right now?",
    inputType: "text",
    completionButtonText: "Story Reframed",
    controlLine: "Today, I control my perspective.",
    surrenderLine: "Surrender comparison and resentment. Release the interpretation that is stealing your peace.",
    questAction: "Name the heavy story, then write a truer version of it.",
    integrityRep: "Reframe one hard moment without denying that it is hard.",
    reflection: "What becomes possible when the story gets more honest?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 2 – The Spark of Gratitude: Igniting the First Love Circuit (Pages 15–22)",
      text: "Gratitude is not pretending everything is good. It is remembering what still works.\n\nWhen stress takes over, your world shrinks. Gratitude gently widens it. Not to erase pain, but to include what hasn't been lost.\n\nPerspective restores balance. It reminds you why this matters.",
    },
  },
  {
    day: 3,
    controllable: "Habit",
    emoji: "🦈",
    framingLine: "Keep One Small Promise",
    prompt: "What promise can you keep today?",
    inputType: "text",
    completionButtonText: "Promise Kept",
    controlLine: "Today, I control whether I keep my word.",
    surrenderLine: "Surrender perfection. Release the pressure to do more than today requires.",
    questAction: "Choose one promise small enough to finish before the day ends.",
    integrityRep: "Complete one honest rep, no matter how small.",
    reflection: "What happens to self-trust when you keep a promise?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 4 – The Symphony of Positive Choices: Fine-Tuning Your Circuits (Pages 27–34)",
      text: "You don't need a perfect plan. You need one promise you can keep.\n\nSmall actions, done honestly, rebuild trust with yourself. One rep keeps momentum alive. One rep proves you show up.\n\nThis is how habits form. Quietly. Over time.",
    },
  },
  {
    day: 4,
    controllable: "Wellness",
    emoji: "🛰️",
    framingLine: "Protect the Vessel",
    prompt: "What does your body need before you demand more from it?",
    inputType: "text",
    completionButtonText: "Vessel Protected",
    controlLine: "Today, I control how I care for the vessel carrying the work.",
    surrenderLine: "Surrender the belief that exhaustion proves commitment.",
    questAction: "Choose one recovery move: water, food, movement, sleep, breath, or quiet.",
    integrityRep: "Meet one physical need before pushing for more output.",
    reflection: "What changes when your body is treated as part of the mission?",
    reading: {
      source: "The Controllables",
      chapter: "The Controllables - Wellness Practice",
      text: "You are a spiritual being operating a human body. The body is not separate from the work. It is the vessel that carries the work.\n\nWellness is not vanity. It is stewardship. Before you demand more from yourself, ask what your body needs to stay honest, steady, and available.",
    },
  },
  {
    day: 5,
    controllable: "Environment",
    emoji: "🚀",
    framingLine: "Change the Field",
    prompt: "What needs to change around you so you can show up better?",
    inputType: "text",
    completionButtonText: "Field Changed",
    controlLine: "Today, I control the conditions I can shape.",
    surrenderLine: "Surrender the habit of blaming a field you have not tried to adjust.",
    questAction: "Remove one point of friction from your space, calendar, people loop, or phone.",
    integrityRep: "Make the right next action easier to choose.",
    reflection: "What condition around you has been making the right move harder?",
    reading: {
      source: "The Controllables",
      chapter: "The Controllables - Environment Practice",
      text: "Environment is the field you keep stepping into. Some fields make alignment easier. Some fields keep feeding drift.\n\nYou do not control everything around you, but you can shape more than you think. Move one object. Cancel one avoidable demand. Ask one better question. Build the conditions.",
    },
  },
  {
    day: 6,
    controllable: "Ego",
    emoji: "⚠️",
    framingLine: "Identify the False Voice",
    prompt: "Where is Ego loud today?",
    inputType: "text",
    completionButtonText: "Ego Named",
    controlLine: "Today, I control whether I obey the false voice.",
    surrenderLine: "Surrender the need to prove, perform, compare, avoid, or grip.",
    questAction: "Write the sentence Ego is using, then answer it with one Controllable response.",
    integrityRep: "Choose one grounded practice instead of the loudest impulse.",
    reflection: "What does Ego sound like when it is trying to protect you from growth?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 6 – The Ego's Hijack: Recognizing the Enemy Within (Pages 40–45)",
      text: "The ego wants comfort, not growth. It whispers reasons to delay, avoid, compare, perform, or quit.\n\nYou do not have to fight it like a cartoon villain. You have to identify the voice, tell the truth, and choose the next honest move.\n\nConfidence is built here.",
    },
  },
  {
    day: 7,
    controllable: "Integration",
    emoji: "🔄",
    framingLine: "Choose Your Next Season",
    prompt: "What changed this week, and what is your next honest commitment?",
    inputType: "text",
    completionButtonText: "Reset Complete",
    controlLine: "Today, I control my next commitment.",
    surrenderLine: "Surrender the need to fix your whole life before you take the next step.",
    questAction: "Acknowledge what changed. Choose one next season of practice.",
    integrityRep: "Write down the reset protocol you will return to.",
    reflection: "What will you practice next when drift shows up again?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 9 – The Continuous Upgrade: Always Get Better (Pages 45–50)",
      text: "This week was not about perfection. It was about re-entry.\n\nYou noticed. You chose. You adjusted.\n\nThat means you know how to come back.\n\nLife will pull you off track again. That's normal. The win is knowing how to reset without shame.",
    },
  },
];

export const getDayContent = (dayNumber: number): DayContent => {
  return RESET_DAYS[dayNumber - 1] || RESET_DAYS[0];
};

// Missed day message - no shame, just encouragement
export const MISSED_DAY_MESSAGE = "You're back. That's what matters. Pick up where you left off.";

// Covenant text - book-aligned reset framing
export const COVENANT_TEXT = `You have met the 5 Controllables. Now it is time to train them.

This 7-Day Reset will help you:
• Start each day with one honest read
• Control what you can and release what is not yours
• Build confidence through kept promises

I choose to practice what I can control.`;

export const COVENANT_CHECKBOX_TEXT = "I commit to showing up for 7 days. Not perfectly. Just presently.";
