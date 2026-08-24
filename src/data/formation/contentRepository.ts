import { supabase } from "@/integrations/supabase/client";
import {
  type ContentReviewStatus,
  type FormationContentDraft,
  type FormationContentType,
  type FormationContentVersion,
} from "@/domain/formation/content";
import type { TrainingTrack } from "@/domain/formation/circuits";

export interface FormationDayPublishedContent {
  id: string;
  dayNumber: number;
  title: string;
  body: string;
  scriptureReference: string | null;
}

type ContentItemRow = { id: string; stable_id: string; content_type: string };
type ContentVersionRow = {
  id: string;
  item_id: string;
  version: number;
  title: string;
  slug: string;
  body: string;
  formation_track: string;
  day_start: number | null;
  day_end: number | null;
  formation_season: string | null;
  book_chapter: string | null;
  spoiler_level: number;
  scripture_reference: string | null;
  bible_translation: string | null;
  evidence_classification: string | null;
  source_citations: string[];
  author: string;
  reviewer: string | null;
  theological_review_status: string;
  historical_review_status: string;
  publication_status: string;
  effective_date: string | null;
  last_reviewed_date: string | null;
  ai_assisted: boolean;
  created_at: string;
  published_at: string | null;
};

function normalizeVersion(row: ContentVersionRow, item: ContentItemRow): FormationContentVersion {
  return {
    id: row.id,
    itemId: row.item_id,
    stableId: item.stable_id,
    title: row.title,
    slug: row.slug,
    contentType: item.content_type as FormationContentType,
    body: row.body,
    formationTrack: row.formation_track as FormationContentVersion["formationTrack"],
    dayStart: row.day_start,
    dayEnd: row.day_end,
    formationSeason: row.formation_season as FormationContentVersion["formationSeason"],
    bookChapter: row.book_chapter,
    spoilerLevel: row.spoiler_level,
    scriptureReference: row.scripture_reference,
    bibleTranslation: row.bible_translation,
    evidenceClassification: row.evidence_classification as FormationContentVersion["evidenceClassification"],
    sourceCitations: row.source_citations,
    author: row.author,
    reviewer: row.reviewer,
    theologicalReviewStatus: row.theological_review_status as ContentReviewStatus,
    historicalReviewStatus: row.historical_review_status as ContentReviewStatus,
    publicationStatus: row.publication_status as FormationContentVersion["publicationStatus"],
    version: row.version,
    effectiveDate: row.effective_date,
    lastReviewedDate: row.last_reviewed_date,
    aiAssisted: row.ai_assisted,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

export async function listFormationContentVersions(): Promise<FormationContentVersion[]> {
  const [{ data: items, error: itemError }, { data: versions, error: versionError }] = await Promise.all([
    supabase.from("formation_content_items").select("id, stable_id, content_type"),
    supabase.from("formation_content_versions").select("*").order("created_at", { ascending: false }),
  ]);
  if (itemError) throw itemError;
  if (versionError) throw versionError;
  const itemMap = new Map((items as ContentItemRow[]).map((item) => [item.id, item]));
  return (versions as ContentVersionRow[]).flatMap((version) => {
    const item = itemMap.get(version.item_id);
    return item ? [normalizeVersion(version, item)] : [];
  });
}

export async function loadPublishedFormationContentForDay(
  track: TrainingTrack,
  dayNumber: number,
): Promise<FormationDayPublishedContent | null> {
  if (track !== "fully_charged_75" || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 75) return null;

  const { data, error } = await supabase.rpc("get_current_fully_charged_content");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    value.dayNumber !== dayNumber ||
    typeof value.title !== "string" ||
    typeof value.body !== "string"
  ) return null;
  return {
    id: value.id,
    dayNumber,
    title: value.title,
    body: value.body,
    scriptureReference: typeof value.scriptureReference === "string" ? value.scriptureReference : null,
  };
}

export async function saveFormationContentDraft(draft: FormationContentDraft, imported = false): Promise<void> {
  const { error } = await supabase.rpc("save_formation_content_draft", {
    p_payload: { ...draft, imported },
  });
  if (error) throw error;
}

export async function submitFormationContentForReview(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("submit_formation_content_for_review", { p_version_id: versionId });
  if (error) throw error;
}

export async function reviewFormationContentVersion(input: {
  versionId: string;
  reviewer: string;
  theologicalStatus: "approved" | "changes_requested";
  historicalStatus: "not_required" | "approved" | "changes_requested";
  note?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("review_formation_content_version", {
    p_version_id: input.versionId,
    p_reviewer: input.reviewer,
    p_theological_status: input.theologicalStatus,
    p_historical_status: input.historicalStatus,
    p_note: input.note ?? null,
  });
  if (error) throw error;
}

export async function publishFormationContentVersion(versionId: string, effectiveDate: string): Promise<void> {
  const { error } = await supabase.rpc("publish_formation_content_version", {
    p_version_id: versionId,
    p_effective_date: effectiveDate,
  });
  if (error) throw error;
}
