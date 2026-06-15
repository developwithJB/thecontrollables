import type { ControllableType } from "@/components/ControllableCard";
import { CONTROLLABLE_GUIDES, CONTROLLABLE_GUIDE_IDS, getControllableGuideClasses } from "@/lib/controllables";

export interface BookControllable {
  id: ControllableType;
  name: string;
  emoji: string;
  role: string;
  coreQuestion: string;
  currentState: string;
  recommendedPractice: string;
  signalLanguage: string;
  classes: ReturnType<typeof getControllableGuideClasses>;
}

export interface ResetDay {
  day: number;
  focus: string;
  practice: string;
  description: string;
}

const BOOK_CONTROLLABLE_COPY: Record<
  ControllableType,
  Pick<BookControllable, "role" | "coreQuestion" | "currentState" | "recommendedPractice" | "signalLanguage">
> = {
  awareness: {
    role: "Helps you see what is true before you react.",
    coreQuestion: "What is true right now?",
    currentState: "Clarity check",
    recommendedPractice: "Name one true thing, one signal, and one next step.",
    signalLanguage: "Notice what is true.",
  },
  perspective: {
    role: "Helps you slow down, zoom out, and reframe what feels heavy.",
    coreQuestion: "What story am I telling myself?",
    currentState: "Reframe practice",
    recommendedPractice: "Rewrite the pressure into a truer, calmer story.",
    signalLanguage: "Reframe what is heavy.",
  },
  habit: {
    role: "Helps you turn belief into action through kept promises.",
    coreQuestion: "What promise can I keep today?",
    currentState: "Promise integrity",
    recommendedPractice: "Choose one small promise and finish it before the day ends.",
    signalLanguage: "Keep the promise.",
  },
  wellness: {
    role: "Helps you protect the body and nervous system that carry the work.",
    coreQuestion: "What does my body need before I demand more from it?",
    currentState: "Vessel protection",
    recommendedPractice: "Pick the recovery move that makes the rest of the day more honest.",
    signalLanguage: "Protect the vessel.",
  },
  environment: {
    role: "Helps you shape the conditions around you so showing up is easier.",
    coreQuestion: "What needs to change around me so I can show up better?",
    currentState: "Field reset",
    recommendedPractice: "Remove one point of friction from your space, calendar, or people loop.",
    signalLanguage: "Build the conditions.",
  },
};

export const BOOK_CONTROLLABLES: BookControllable[] = CONTROLLABLE_GUIDE_IDS.map((id) => {
  const guide = CONTROLLABLE_GUIDES[id];
  const copy = BOOK_CONTROLLABLE_COPY[id];

  return {
    id,
    name: guide.name,
    emoji: guide.emoji,
    ...copy,
    classes: getControllableGuideClasses(id),
  };
});

export const SEVEN_DAY_CONTROLLABLES_RESET: ResetDay[] = [
  {
    day: 1,
    focus: "Awareness",
    practice: "Name what is true",
    description: "Start with an honest read instead of a performance plan.",
  },
  {
    day: 2,
    focus: "Perspective",
    practice: "Reframe the story",
    description: "Slow the moment down and separate fact from interpretation.",
  },
  {
    day: 3,
    focus: "Habit",
    practice: "Keep one small promise",
    description: "Build self-trust with a promise small enough to finish.",
  },
  {
    day: 4,
    focus: "Wellness",
    practice: "Protect the vessel",
    description: "Respect the body and nervous system before demanding more.",
  },
  {
    day: 5,
    focus: "Environment",
    practice: "Change the field",
    description: "Adjust the conditions around you so the right move is easier.",
  },
  {
    day: 6,
    focus: "Ego",
    practice: "Identify the false voice",
    description: "Notice where Ego turns pressure into all-or-nothing thinking.",
  },
  {
    day: 7,
    focus: "Integration",
    practice: "Choose your next season",
    description: "Carry the framework forward through one clear next commitment.",
  },
];

export function getBookControllable(id: ControllableType | null | undefined): BookControllable {
  return BOOK_CONTROLLABLES.find((controllable) => controllable.id === id) ?? BOOK_CONTROLLABLES[0];
}

