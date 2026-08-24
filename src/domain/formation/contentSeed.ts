import { createNewContentDraft, type FormationContentDraft, type FormationContentType } from "./content";
import type { TrainingTrack } from "./circuits";
import { FULLY_CHARGED_75_DAY_GUIDES } from "./fullyChargedJourney";

type SeedInput = {
  stableId: string;
  title: string;
  contentType: FormationContentType;
  body: string;
  track?: TrainingTrack | "all";
  days?: [number, number];
  season?: FormationContentDraft["formationSeason"];
  chapter?: string;
  scripture?: string;
  classification?: FormationContentDraft["evidenceClassification"];
  citations?: string[];
};

const seed = (input: SeedInput): FormationContentDraft => ({
  ...createNewContentDraft("Formation Editorial Team"),
  stableId: input.stableId,
  title: input.title,
  slug: input.stableId.replace(/[._]/g, "-"),
  contentType: input.contentType,
  body: input.body,
  formationTrack: input.track ?? "all",
  dayStart: input.days?.[0] ?? null,
  dayEnd: input.days?.[1] ?? null,
  formationSeason: input.season ?? null,
  bookChapter: input.chapter ?? null,
  scriptureReference: input.scripture ?? null,
  bibleTranslation: input.scripture ? "Reference only—translation selected by licensed publisher configuration" : null,
  evidenceClassification: input.classification ?? null,
  sourceCitations: input.citations ?? [],
  reviewer: "Human reviewer required before publication",
  theologicalReviewStatus: "pending",
  historicalReviewStatus: input.classification === "Historical Context" ? "pending" : "not_required",
  publicationStatus: "draft",
});

export const FULLY_CHARGED_75_CONTENT_SEED: FormationContentDraft[] = FULLY_CHARGED_75_DAY_GUIDES.map((guide) =>
  seed({
    stableId: guide.stableId,
    title: `Day ${guide.dayNumber}: ${guide.title}`,
    contentType: "daily_scripture_assignment",
    body: `${guide.invitation}\n\nReflection: ${guide.reflectionPrompt}\n\nEnvironment: ${guide.servicePrompt}`,
    track: "fully_charged_75",
    days: [guide.dayNumber, guide.dayNumber],
    season: guide.season,
    scripture: guide.scriptureReference,
    classification: "Scripture",
  }),
);

export const REPRESENTATIVE_FORMATION_CONTENT_SEED: FormationContentDraft[] = [
  seed({ stableId: "read-along.chapter-1", title: "Read Along: Chapter One Practice", contentType: "read_along_prompt", body: "Read the visible chapter section, note one honest application, and stop before later material.", track: "read_along", chapter: "1" }),
  seed({ stableId: "day.1.scripture", title: "Day 1 Scripture Assignment", contentType: "daily_scripture_assignment", body: "Open the passage before the day’s noise and observe what the text actually says.", days: [1, 1], season: "be_with_jesus", scripture: "Matthew 4:18-22", classification: "Scripture" }),
  seed({ stableId: "day.2.prayer", title: "Day 2 Prayerful Attention", contentType: "circuit_practice", body: "Practice honest attention without recording prayer text.", days: [2, 2], season: "be_with_jesus" }),
  seed({ stableId: "day.25.review", title: "Day 25 Season Review", contentType: "weekly_review", body: "What helped you stay with Jesus, and what do you want to carry into the next season?", days: [25, 25], season: "be_with_jesus" }),
  seed({ stableId: "day.26.transition", title: "Season Two: Become Like Jesus", contentType: "formation_season_introduction", body: "This transition names a new practice emphasis. It does not make you more loved by God.", days: [26, 26], season: "become_like_jesus" }),
  seed({ stableId: "day.27.integrity", title: "Day 27 Integrity Practice", contentType: "circuit_practice", body: "Name one keepable promise and answer honestly about it.", days: [27, 27], season: "become_like_jesus" }),
  seed({ stableId: "day.50.recovery", title: "Day 50 Recovery Review", contentType: "recovery_prompt", body: "Name how you returned without erasing the drift that came before it.", days: [50, 50], season: "become_like_jesus" }),
  seed({ stableId: "day.51.transition", title: "Season Three: Do What Jesus Did", contentType: "formation_season_introduction", body: "This season turns attention toward mercy, service, encouragement, generosity, community, and mission without comparison.", days: [51, 51], season: "do_what_jesus_did" }),
  seed({ stableId: "day.52.service", title: "Day 52 Quiet Service", contentType: "service_mission", body: "Encourage or help someone without recording their identity, hardship, contact information, or image.", days: [52, 52], season: "do_what_jesus_did" }),
  seed({ stableId: "day.75.completion", title: "Day 75 Closing Practice", contentType: "completion_language", body: "You did not earn God’s love through this journey. You practiced living from it.", days: [75, 75], season: "do_what_jesus_did" }),
  seed({ stableId: "circuit.awareness", title: "Awareness Circuit Practice", contentType: "circuit_practice", body: "Separate what Scripture says from the assumption you brought to the moment." }),
  seed({ stableId: "circuit.perspective", title: "Perspective Circuit Practice", contentType: "control_release_move_prompt", body: "Name what is yours to control, what to release, and one faithful move." }),
  seed({ stableId: "circuit.habit", title: "Habit Circuit Practice", contentType: "circuit_practice", body: "Name one Main Promise before adding optional proof." }),
  seed({ stableId: "circuit.wellness", title: "Wellness Circuit Practice", contentType: "circuit_practice", body: "Choose safe movement appropriate to your body, recovery, guidance, and conditions." }),
  seed({ stableId: "circuit.environment", title: "Environment Circuit Practice", contentType: "service_mission", body: "Remove friction, prepare tomorrow, and quietly help without exposing another person." }),
  seed({ stableId: "witness.act-1.collector", title: "The Witness Act I: The Collector", contentType: "witness_act", body: "Examine the visible Matthew passage and distinguish observation from assumption.", scripture: "Matthew 9:9", classification: "Scripture" }),
  seed({ stableId: "witness.act-2.call", title: "The Witness Act II: The Call", contentType: "witness_act", body: "Attend to the call in the text and name one faithful response without inventing dialogue.", scripture: "Matthew 9:9", classification: "Scripture" }),
  seed({ stableId: "witness.act-3.table", title: "The Witness Act III: The Table", contentType: "witness_act", body: "Observe who is present at the table and how the passage frames mercy.", scripture: "Matthew 9:10-13", classification: "Scripture" }),
  seed({ stableId: "witness.act-4.evidence", title: "The Witness Act IV: The Evidence", contentType: "witness_evidence", body: "Compare textual observations with clearly cited historical context before drawing a conclusion.", scripture: "Matthew 11:2-6", classification: "Scholarly Interpretation" }),
  seed({ stableId: "witness.act-5.verdict", title: "The Witness Act V: The Verdict", contentType: "witness_act", body: "Respond to the text through a faithful action while keeping interpretation distinct from Scripture.", scripture: "Matthew 16:13-17", classification: "Scripture" }),
  seed({ stableId: "recovery.win.sample", title: "Recovery Win", contentType: "recovery_prompt", body: "What honest return did you make, and what will you adapt next?", track: "charge_40" }),
  seed({ stableId: "service.weekly.sample", title: "Weekly Service Mission", contentType: "service_mission", body: "Offer practical encouragement or help. Record only that it happened, never the recipient’s private story.", track: "charge_40" }),
  seed({ stableId: "review.weekly.sample", title: "Weekly Formation Review", contentType: "weekly_review", body: "What helped, what caused drift, what can adapt, and what will you carry forward?" }),
  seed({ stableId: "completion.sample", title: "Grace-Centered Completion", contentType: "completion_language", body: "Celebrate faithfulness, honesty, stewardship, recovery, service, kept promises, and time spent with Jesus—never earned love or comparative maturity." }),
];

export const INITIAL_FORMATION_CONTENT_SEED: FormationContentDraft[] = [
  ...FULLY_CHARGED_75_CONTENT_SEED,
  ...REPRESENTATIVE_FORMATION_CONTENT_SEED,
];
