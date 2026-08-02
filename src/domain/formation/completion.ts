import { TRACK_LABELS, type TrainingTrack } from "./circuits";

export const COMPLETION_RECORD_VERSION = "formation-completion-v1" as const;

export const CLOSING_REFLECTION_PROMPTS = [
  ["relationshipWithJesus", "What changed in your relationship with Jesus?"],
  ["strongerControllable", "Which Controllable became stronger?"],
  ["stillBeingFormed", "Where are you still being formed?"],
  ["promiseLesson", "What promise taught you the most?"],
  ["recoveryLesson", "What did recovery teach you?"],
  ["serviceNext", "How do you want to serve next?"],
  ["carryForward", "What will you carry forward?"],
] as const;

export type ClosingReflectionKey = (typeof CLOSING_REFLECTION_PROMPTS)[number][0];
export type ClosingReflection = Record<ClosingReflectionKey, string>;

export const NEXT_STEP_OPTIONS = [
  ["daily_rhythm", "Continue a daily rhythm", "Keep a gentle practice without immediately beginning another strict challenge."],
  ["reread", "Reread The Controllables", "Return to the book with the experience of this journey beside you."],
  ["small_group", "Lead a small group", "Invite community without turning another person’s formation into a score."],
  ["formation_season", "Begin another formation season", "Choose a focused season when the timing is honest."],
  ["new_attempt", "Start a new Fully Charged attempt", "Available when you freely choose it; never the default pressure."],
  ["witness", "Continue exploring The Witness", "Stay close to Scripture, evidence, context, and faithful action."],
  ["planned_recovery", "Take a planned recovery period", "Rest and integration can be the faithful next step."],
] as const;

export type CompletionNextStep = (typeof NEXT_STEP_OPTIONS)[number][0];

export interface FormationCompletionCounts {
  datesPracticed: number;
  controllableReps: number;
  scriptureProgress: number;
  witnessProgress: number;
  promisesKept: number;
  recoveryDecisions: number;
  serviceReps: number;
  privateProofCount: number;
  formationSeasonsCompleted: number;
}

export interface FormationCompletionRecord {
  id: string;
  userId: string;
  track: TrainingTrack;
  completionKey: string;
  ruleVersion: string;
  contentVersion: string;
  startedOn: string | null;
  completedOn: string;
  counts: FormationCompletionCounts;
  createdAt: string;
  isPreview: boolean;
}

export interface FormationCompletionReflection {
  recordId: string;
  answers: ClosingReflection;
  nextStep: CompletionNextStep | null;
  updatedAt: string;
  localOnly: boolean;
}

export interface MilestoneShareDraft {
  includeName: boolean;
  displayName: string;
  includeQuote: boolean;
  selectedQuote: string;
}

export interface PrivacySafeMilestone {
  schemaVersion: "formation-milestone-v1";
  formationTrack: string;
  completionDate: string;
  controllableReps: number;
  formationSeasonsCompleted: number;
  bookBranding: "The Controllables";
  displayName?: string;
  selectedQuote?: string;
}

export const emptyClosingReflection = (): ClosingReflection => ({
  relationshipWithJesus: "",
  strongerControllable: "",
  stillBeingFormed: "",
  promiseLesson: "",
  recoveryLesson: "",
  serviceNext: "",
  carryForward: "",
});

export function getCompletionHeadline(track: TrainingTrack): string {
  if (track === "read_along") return "A reading milestone worth remembering.";
  if (track === "charge_40") return "Forty days of honest formation practice.";
  return "Seventy-five days, recorded with honesty.";
}

export function getCompletionCelebration(track: TrainingTrack): string {
  const path = TRACK_LABELS[track];
  return `You completed this ${path} record through faithfulness, practice, stewardship, recovery, service, and kept promises. You did not earn God’s love through this journey. You practiced living from it.`;
}

export function validateClosingReflection(answers: ClosingReflection): ClosingReflection {
  return Object.fromEntries(
    CLOSING_REFLECTION_PROMPTS.map(([key]) => [key, String(answers[key] ?? "").trim().slice(0, 4000)]),
  ) as unknown as ClosingReflection;
}

export function buildPrivacySafeMilestone(
  record: FormationCompletionRecord,
  draft: MilestoneShareDraft,
): PrivacySafeMilestone {
  const milestone: PrivacySafeMilestone = {
    schemaVersion: "formation-milestone-v1",
    formationTrack: TRACK_LABELS[record.track],
    completionDate: record.completedOn,
    controllableReps: Math.max(0, Math.floor(record.counts.controllableReps)),
    formationSeasonsCompleted: Math.max(0, Math.floor(record.counts.formationSeasonsCompleted)),
    bookBranding: "The Controllables",
  };

  const displayName = draft.displayName.trim().slice(0, 80);
  const selectedQuote = draft.selectedQuote.trim().slice(0, 220);
  if (draft.includeName && displayName) milestone.displayName = displayName;
  if (draft.includeQuote && selectedQuote) milestone.selectedQuote = selectedQuote;
  return milestone;
}

const XML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeMilestoneText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPE[character]);
}

export function buildMilestoneSvg(milestone: PrivacySafeMilestone): string {
  const name = milestone.displayName ? `<text x="80" y="160" fill="#d7f8ff" font-size="28">${escapeMilestoneText(milestone.displayName)}</text>` : "";
  const quote = milestone.selectedQuote
    ? `<text x="80" y="500" fill="#b7c8d4" font-size="24">“${escapeMilestoneText(milestone.selectedQuote)}”</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="The Controllables completion milestone">
  <defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#041019"/><stop offset="1" stop-color="#092432"/></linearGradient><linearGradient id="line" x1="0" x2="1"><stop stop-color="#00d8ff"/><stop offset="0.5" stop-color="#5ce39d"/><stop offset="1" stop-color="#dab6ff"/></linearGradient></defs>
  <rect width="1200" height="630" rx="36" fill="url(#bg)"/><rect x="32" y="32" width="1136" height="566" rx="28" fill="none" stroke="url(#line)" stroke-width="3"/>
  <text x="80" y="105" fill="#7be6ff" font-size="20" letter-spacing="5">THE CONTROLLABLES</text>${name}
  <text x="80" y="250" fill="#ffffff" font-size="54" font-weight="700">${escapeMilestoneText(milestone.formationTrack)}</text>
  <text x="80" y="315" fill="#d7f8ff" font-size="30">Completion milestone · ${escapeMilestoneText(milestone.completionDate)}</text>
  <text x="80" y="405" fill="#ffffff" font-size="34" font-weight="600">${milestone.controllableReps} Controllable reps</text>
  <text x="80" y="450" fill="#b7c8d4" font-size="24">${milestone.formationSeasonsCompleted} formation seasons completed</text>${quote}
  <text x="80" y="560" fill="#7f98a8" font-size="20">Faithfulness practiced. Private details remain private.</text>
</svg>`;
}

export function serializePrivateCompletionDownload(
  record: FormationCompletionRecord,
  reflection: FormationCompletionReflection,
): string {
  return JSON.stringify(
    {
      schemaVersion: COMPLETION_RECORD_VERSION,
      privacy: "Private personal export. Do not share unless you have reviewed every field.",
      completionRecord: record,
      closingReflection: reflection.answers,
      nextStep: reflection.nextStep,
    },
    null,
    2,
  );
}

export function createCompletionPreview(track: TrainingTrack, now = new Date()): FormationCompletionRecord {
  const completedOn = now.toISOString().slice(0, 10);
  const countsByTrack: Record<TrainingTrack, FormationCompletionCounts> = {
    read_along: {
      datesPracticed: 12,
      controllableReps: 24,
      scriptureProgress: 8,
      witnessProgress: 2,
      promisesKept: 4,
      recoveryDecisions: 2,
      serviceReps: 3,
      privateProofCount: 2,
      formationSeasonsCompleted: 0,
    },
    charge_40: {
      datesPracticed: 40,
      controllableReps: 156,
      scriptureProgress: 36,
      witnessProgress: 8,
      promisesKept: 31,
      recoveryDecisions: 7,
      serviceReps: 6,
      privateProofCount: 12,
      formationSeasonsCompleted: 1,
    },
    fully_charged_75: {
      datesPracticed: 75,
      controllableReps: 375,
      scriptureProgress: 75,
      witnessProgress: 15,
      promisesKept: 68,
      recoveryDecisions: 9,
      serviceReps: 75,
      privateProofCount: 18,
      formationSeasonsCompleted: 3,
    },
  };
  return {
    id: `preview-${track}`,
    userId: "preview",
    track,
    completionKey: `preview:${track}:${completedOn}`,
    ruleVersion: "preview-only",
    contentVersion: "reviewed-sample-v1",
    startedOn: null,
    completedOn,
    counts: countsByTrack[track],
    createdAt: now.toISOString(),
    isPreview: true,
  };
}

