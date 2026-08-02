import { isTrainingTrack, type TrainingTrack } from "./circuits";

export const FORMATION_CONTENT_TYPES = [
  "daily_scripture_assignment",
  "formation_season_introduction",
  "circuit_practice",
  "book_chapter_practice",
  "read_along_prompt",
  "control_release_move_prompt",
  "ego_signal",
  "recovery_prompt",
  "service_mission",
  "weekly_review",
  "witness_act",
  "witness_evidence",
  "gospel_comparison",
  "historical_context",
  "completion_language",
  "email_guidance",
] as const;

export type FormationContentType = (typeof FORMATION_CONTENT_TYPES)[number];

export const EVIDENCE_CLASSIFICATIONS = [
  "Scripture",
  "Historical Context",
  "Christian Tradition",
  "Scholarly Interpretation",
  "Creative Reconstruction",
] as const;
export type EvidenceClassification = (typeof EVIDENCE_CLASSIFICATIONS)[number];

export const FORMATION_SEASONS = ["be_with_jesus", "become_like_jesus", "do_what_jesus_did"] as const;
export type FormationSeason = (typeof FORMATION_SEASONS)[number];

export const CONTENT_REVIEW_STATUSES = ["not_required", "pending", "approved", "changes_requested"] as const;
export type ContentReviewStatus = (typeof CONTENT_REVIEW_STATUSES)[number];

export const CONTENT_PUBLICATION_STATUSES = ["draft", "in_review", "published", "archived"] as const;
export type ContentPublicationStatus = (typeof CONTENT_PUBLICATION_STATUSES)[number];

export interface FormationContentVersion {
  id: string;
  itemId: string;
  stableId: string;
  title: string;
  slug: string;
  contentType: FormationContentType;
  body: string;
  formationTrack: TrainingTrack | "all";
  dayStart: number | null;
  dayEnd: number | null;
  formationSeason: FormationSeason | null;
  bookChapter: string | null;
  spoilerLevel: number;
  scriptureReference: string | null;
  bibleTranslation: string | null;
  evidenceClassification: EvidenceClassification | null;
  sourceCitations: string[];
  author: string;
  reviewer: string | null;
  theologicalReviewStatus: ContentReviewStatus;
  historicalReviewStatus: ContentReviewStatus;
  publicationStatus: ContentPublicationStatus;
  version: number;
  effectiveDate: string | null;
  lastReviewedDate: string | null;
  aiAssisted: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export type FormationContentDraft = Omit<FormationContentVersion, "id" | "itemId" | "createdAt" | "publishedAt">;

export interface ContentValidationIssue {
  field: keyof FormationContentDraft | "general";
  message: string;
  severity: "error" | "warning";
}

const SCRIPTURE_REFERENCE_PATTERN = /^(?:[1-3]\s*)?[A-Za-z][A-Za-z ]+\s+\d+(?::\d+(?:-\d+)?)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function validateFormationContent(
  draft: FormationContentDraft,
  mode: "draft" | "review" | "publish" = "draft",
): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const error = (field: ContentValidationIssue["field"], message: string) => issues.push({ field, message, severity: "error" });
  const warning = (field: ContentValidationIssue["field"], message: string) => issues.push({ field, message, severity: "warning" });

  if (!STABLE_ID_PATTERN.test(draft.stableId)) error("stableId", "Use a stable lowercase identifier with dots, dashes, or underscores.");
  if (!draft.title.trim()) error("title", "Title is required.");
  if (!SLUG_PATTERN.test(draft.slug)) error("slug", "Slug must be lowercase kebab-case.");
  if (!FORMATION_CONTENT_TYPES.includes(draft.contentType)) error("contentType", "Choose a supported content type.");
  if (draft.formationTrack !== "all" && !isTrainingTrack(draft.formationTrack)) error("formationTrack", "Choose a supported formation track.");
  if (!draft.body.trim()) error("body", "Content body is required.");
  if (draft.body.length > 30_000) error("body", "Content body must be 30,000 characters or fewer.");
  if (!draft.author.trim()) error("author", "Author is required.");
  if (!Number.isInteger(draft.version) || draft.version < 1) error("version", "Version must be a positive integer.");
  if (!Number.isInteger(draft.spoilerLevel) || draft.spoilerLevel < 0 || draft.spoilerLevel > 5) error("spoilerLevel", "Spoiler level must be between 0 and 5.");

  if ((draft.dayStart === null) !== (draft.dayEnd === null)) error("dayStart", "Day start and day end must be set together.");
  if (draft.dayStart !== null && draft.dayEnd !== null) {
    if (!Number.isInteger(draft.dayStart) || !Number.isInteger(draft.dayEnd) || draft.dayStart < 1 || draft.dayEnd > 75 || draft.dayEnd < draft.dayStart) {
      error("dayStart", "Day range must be ordered between day 1 and day 75.");
    }
  }

  if (draft.scriptureReference && !SCRIPTURE_REFERENCE_PATTERN.test(draft.scriptureReference.trim())) {
    error("scriptureReference", "Use a Scripture reference such as Matthew 9:9-13.");
  }
  if (draft.scriptureReference && !draft.bibleTranslation?.trim()) error("bibleTranslation", "Bible translation is required with a Scripture reference.");
  if (draft.bibleTranslation && !draft.scriptureReference?.trim()) error("scriptureReference", "Scripture reference is required with a Bible translation.");

  const historical = draft.contentType === "historical_context" || draft.evidenceClassification === "Historical Context";
  if (historical && draft.sourceCitations.length === 0) error("sourceCitations", "Historical claims require at least one source citation.");
  if (draft.sourceCitations.some((citation) => !/^https:\/\//.test(citation))) error("sourceCitations", "Source citations must use HTTPS links.");

  if (draft.evidenceClassification === "Creative Reconstruction" && !/^Creative Reconstruction:/i.test(draft.body.trim())) {
    error("body", "Creative reconstruction must begin with the visible label “Creative Reconstruction:”.");
  }

  const scriptureContent = draft.contentType === "daily_scripture_assignment" || draft.evidenceClassification === "Scripture";
  if (scriptureContent && !draft.scriptureReference) error("scriptureReference", "Scripture content requires a validated reference.");

  if (mode !== "draft") {
    if (!draft.reviewer?.trim()) error("reviewer", "A human reviewer is required before review or publication.");
    if (draft.reviewer?.trim() && draft.reviewer.trim().toLowerCase() === draft.author.trim().toLowerCase()) {
      error("reviewer", "Author and reviewer must be different people.");
    }
  }

  if (mode === "publish") {
    if (draft.theologicalReviewStatus !== "approved") error("theologicalReviewStatus", "Theological review must be approved before publication.");
    if (historical && draft.historicalReviewStatus !== "approved") error("historicalReviewStatus", "Historical review must be approved before publication.");
    if (!draft.effectiveDate || !DATE_PATTERN.test(draft.effectiveDate)) error("effectiveDate", "A valid effective date is required before publication.");
    if (!draft.lastReviewedDate || !DATE_PATTERN.test(draft.lastReviewedDate)) error("lastReviewedDate", "A valid last-reviewed date is required before publication.");
    if (draft.aiAssisted && !draft.reviewer?.trim()) error("reviewer", "AI-assisted content cannot publish without human review.");
  } else if (draft.publicationStatus === "published") {
    warning("publicationStatus", "Use the publication control after validation; drafts cannot publish themselves.");
  }

  return issues;
}

export function canPublishFormationContent(draft: FormationContentDraft): boolean {
  return validateFormationContent(draft, "publish").every((issue) => issue.severity !== "error");
}

export function createNewContentDraft(author = ""): FormationContentDraft {
  return {
    stableId: "",
    title: "",
    slug: "",
    contentType: "circuit_practice",
    body: "",
    formationTrack: "all",
    dayStart: null,
    dayEnd: null,
    formationSeason: null,
    bookChapter: null,
    spoilerLevel: 0,
    scriptureReference: null,
    bibleTranslation: null,
    evidenceClassification: null,
    sourceCitations: [],
    author,
    reviewer: null,
    theologicalReviewStatus: "pending",
    historicalReviewStatus: "not_required",
    publicationStatus: "draft",
    version: 1,
    effectiveDate: null,
    lastReviewedDate: null,
    aiAssisted: false,
  };
}

export function createNextContentVersion(source: FormationContentVersion, author: string): FormationContentDraft {
  const { id: _id, itemId: _itemId, createdAt: _createdAt, publishedAt: _publishedAt, ...draft } = source;
  return {
    ...draft,
    author,
    reviewer: null,
    theologicalReviewStatus: "pending",
    historicalReviewStatus: source.evidenceClassification === "Historical Context" || source.contentType === "historical_context" ? "pending" : "not_required",
    publicationStatus: "draft",
    version: source.version + 1,
    effectiveDate: null,
    lastReviewedDate: null,
  };
}

export function serializeFormationContentExport(versions: FormationContentVersion[]): string {
  return JSON.stringify({ schemaVersion: "formation-content-export-v1", exportedAt: new Date().toISOString(), versions }, null, 2);
}

export function parseFormationContentImport(value: string): FormationContentDraft[] {
  const parsed = JSON.parse(value) as { schemaVersion?: string; versions?: unknown[] };
  if (parsed.schemaVersion !== "formation-content-export-v1" || !Array.isArray(parsed.versions)) {
    throw new Error("Unsupported formation content import file.");
  }
  return parsed.versions.map((candidate) => {
    if (!candidate || typeof candidate !== "object") throw new Error("Invalid content version in import.");
    const row = candidate as FormationContentVersion;
    const { id: _id, itemId: _itemId, createdAt: _createdAt, publishedAt: _publishedAt, ...draft } = row;
    const issues = validateFormationContent(draft, "draft").filter((issue) => issue.severity === "error");
    if (issues.length) throw new Error(`Invalid imported content ${draft.stableId || "item"}: ${issues[0].message}`);
    return { ...draft, publicationStatus: "draft", reviewer: null, theologicalReviewStatus: "pending" };
  });
}

