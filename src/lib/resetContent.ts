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
    controllable: "Awareness",
    emoji: "👁️",
    framingLine: "You Are Here",
    prompt: "What's one thing you're noticing right now that you usually ignore?",
    inputType: "text",
    completionButtonText: "I Paused",
    controlLine: "Today, I control my attention.",
    surrenderLine: "Release the need to control everything today. Surrender what you cannot control.",
    questAction: "Pause once today before reacting. Just notice.",
    integrityRep: "Notice one automatic thought without acting on it",
    reflection: "What happens when you pause before reacting?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 1 – The Dashboard: A New Beginning (Pages 6–13)",
      text: "You are not broken. You are not behind. You are simply aware now.\n\nMost people live inside reactions without ever seeing the controls. Awareness is the moment you realize you are not your thoughts. You are the one noticing them.\n\nThis is your Dashboard. Not to control everything, but to see clearly.\n\nYou are a spiritual being operating a human body. Awareness is remembering you have choice.",
    },
  },
  {
    day: 2,
    controllable: "Perspective",
    emoji: "🔭",
    framingLine: "Widen the View",
    prompt: "What's one thing that's still good right now?",
    inputType: "text",
    completionButtonText: "View Widened",
    controlLine: "Today, I control my perspective.",
    surrenderLine: "Surrender comparison and resentment. Release what is stealing your peace.",
    questAction: "Name one thing that is still good right now.",
    integrityRep: "Write down three things you're grateful for",
    reflection: "How does gratitude change your view of problems?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 2 – The Spark of Gratitude: Igniting the First Love Circuit (Pages 15–22)",
      text: "Gratitude is not pretending everything is good. It is remembering what still works.\n\nWhen stress takes over, your world shrinks. Gratitude gently widens it. Not to erase pain, but to include what hasn't been lost.\n\nPerspective restores balance. It reminds you why this matters.",
    },
  },
  {
    day: 3,
    controllable: "Resilience",
    emoji: "🌱",
    framingLine: "Setbacks Are Information",
    prompt: "What's one recent setback? What did it teach you?",
    inputType: "text",
    completionButtonText: "Lesson Learned",
    controlLine: "Today, I control my response to setbacks.",
    surrenderLine: "Surrender the story that this setback defines you. Release self-judgment.",
    questAction: "Name one recent setback. Write what it taught you.",
    integrityRep: "Reframe one failure as feedback",
    reflection: "What if setbacks were teachers, not verdicts?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 3 – A Resilient Bloom: Turning Setbacks Into Strengths (Pages 21–27)",
      text: "A setback is not failure. It's feedback.\n\nMost people stop here, not because they can't continue, but because they misread friction as a sign to quit.\n\nResilience is staying curious instead of critical. Learning instead of leaving.",
    },
  },
  {
    day: 4,
    controllable: "Habit",
    emoji: "🦈",
    framingLine: "One Rep Is Enough",
    prompt: "What's one small action you can repeat today?",
    inputType: "text",
    completionButtonText: "Rep Complete",
    controlLine: "Today, I control whether I start.",
    surrenderLine: "Surrender perfection. Release the pressure to do more than today requires.",
    questAction: "Complete one small rep aligned with your quest.",
    integrityRep: "Do one rep—no matter how small",
    reflection: "What if consistency mattered more than intensity?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 4 – The Symphony of Positive Choices: Fine-Tuning Your Circuits (Pages 27–34)",
      text: "You don't need a perfect plan. You need one repeatable action.\n\nSmall actions, done consistently, reshape your system. One rep keeps momentum alive. One rep proves you show up.\n\nThis is how habits form. Quietly. Over time.",
    },
  },
  {
    day: 5,
    controllable: "Response",
    emoji: "⏸️",
    framingLine: "Where Power Lives",
    prompt: "When did you react today instead of respond?",
    inputType: "text",
    completionButtonText: "I Chose",
    controlLine: "Today, I control my response.",
    surrenderLine: "Surrender impulsive reactions. Release the urge to respond immediately.",
    questAction: "Pause once today before responding. Choose deliberately.",
    integrityRep: "Pause before one difficult conversation",
    reflection: "What changes when you respond instead of react?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 5 – The Space Between Stimulus and Response: Reclaiming Your Power (Pages 34–40)",
      text: "Something happens. You feel the urge to react. There is a pause.\n\nThat pause is power.\n\nYou don't control what shows up. You control what you do next.",
    },
  },
  {
    day: 6,
    controllable: "Integrity",
    emoji: "🤝",
    framingLine: "Keep One Promise",
    prompt: "What's one small promise you can keep today?",
    inputType: "text",
    completionButtonText: "Promise Kept",
    controlLine: "Today, I control my word.",
    surrenderLine: "Surrender excuses. Release the need for external validation.",
    questAction: "Keep one small promise to yourself today.",
    integrityRep: "Make only one promise—and keep it",
    reflection: "What would life look like with 100% integrity?",
    reading: {
      source: "The Controllables",
      chapter: "Chapter 6 – The Ego's Hijack: Recognizing the Enemy Within (Pages 40–45)",
      text: "The ego wants comfort, not growth. It whispers reasons to delay, avoid, or quit.\n\nIntegrity is doing what you said you would do, even when no one is watching. Especially then.\n\nConfidence is built here.",
    },
  },
  {
    day: 7,
    controllable: "Integration",
    emoji: "🔄",
    framingLine: "You Know How to Restart",
    prompt: "What changed this week? What's your next step?",
    inputType: "text",
    completionButtonText: "Reset Complete",
    controlLine: "Today, I control my re-entry.",
    surrenderLine: "Surrender fear of falling off again. Release control over the outcome.",
    questAction: "Acknowledge what changed. Decide one next step.",
    integrityRep: "Write down your restart protocol",
    reflection: "What will you do differently next time you fall off?",
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

// Missed day message - no shame, just facts
export const MISSED_DAY_MESSAGE = "You didn't lose progress. You paused the foundation. Ready to resume?";

// Covenant text - updated for foundation-based framing
export const COVENANT_TEXT = `Life is a game. You can play it on purpose, or let the default path play you.

This 7-Day Foundation will help you:
• Build momentum through reps, not motivation
• Track integrity—promises made vs kept
• Use time as currency, not background noise

I choose to play intentionally.`;

export const COVENANT_CHECKBOX_TEXT = "I commit to showing up for 7 days. Not perfectly. Just presently.";
