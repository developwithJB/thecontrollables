import { describe, expect, it } from "vitest";
import {
  canPublishFormationContent,
  createNewContentDraft,
  parseFormationContentImport,
  serializeFormationContentExport,
  validateFormationContent,
  type FormationContentVersion,
} from "@/domain/formation/content";
import { REPRESENTATIVE_FORMATION_CONTENT_SEED } from "@/domain/formation/contentSeed";

const validDraft = () => ({
  ...createNewContentDraft("Author One"),
  stableId: "day.1.scripture",
  title: "Day One Scripture",
  slug: "day-1-scripture",
  contentType: "daily_scripture_assignment" as const,
  body: "Open the passage and observe what it says.",
  scriptureReference: "Matthew 4:18-22",
  bibleTranslation: "Reference only",
  evidenceClassification: "Scripture" as const,
});

describe("formation content operating system", () => {
  it("validates Scripture references and paired translation metadata", () => {
    expect(validateFormationContent(validDraft())).toEqual([]);
    const invalid = validDraft();
    invalid.scriptureReference = "some verse later";
    expect(validateFormationContent(invalid).some((issue) => issue.field === "scriptureReference")).toBe(true);
  });

  it("requires citations and historical approval for historical claims", () => {
    const historical = {
      ...validDraft(),
      stableId: "history.matthew.sample",
      slug: "history-matthew-sample",
      contentType: "historical_context" as const,
      evidenceClassification: "Historical Context" as const,
      scriptureReference: null,
      bibleTranslation: null,
      reviewer: "Reviewer Two",
      theologicalReviewStatus: "approved" as const,
      historicalReviewStatus: "pending" as const,
      effectiveDate: "2026-08-01",
      lastReviewedDate: "2026-08-01",
    };
    expect(canPublishFormationContent(historical)).toBe(false);
    historical.sourceCitations = ["https://example.edu/source"];
    historical.historicalReviewStatus = "approved";
    expect(canPublishFormationContent(historical)).toBe(true);
  });

  it("requires a visible creative-reconstruction label", () => {
    const reconstruction = { ...validDraft(), evidenceClassification: "Creative Reconstruction" as const };
    expect(validateFormationContent(reconstruction).some((issue) => issue.message.includes("Creative reconstruction"))).toBe(true);
    reconstruction.body = "Creative Reconstruction: This scene is illustrative, not Scripture.";
    expect(validateFormationContent(reconstruction).some((issue) => issue.message.includes("Creative reconstruction"))).toBe(false);
  });

  it("blocks publication without independent human review, including AI-assisted drafts", () => {
    const draft = {
      ...validDraft(),
      aiAssisted: true,
      reviewer: "Author One",
      theologicalReviewStatus: "approved" as const,
      effectiveDate: "2026-08-01",
      lastReviewedDate: "2026-08-01",
    };
    expect(canPublishFormationContent(draft)).toBe(false);
    draft.reviewer = "Reviewer Two";
    expect(canPublishFormationContent(draft)).toBe(true);
  });

  it("imports exported versions only as unreviewed drafts", () => {
    const source: FormationContentVersion = {
      ...validDraft(),
      id: "version-1",
      itemId: "item-1",
      version: 1,
      reviewer: "Reviewer Two",
      theologicalReviewStatus: "approved",
      publicationStatus: "published",
      effectiveDate: "2026-08-01",
      lastReviewedDate: "2026-08-01",
      createdAt: "2026-08-01T00:00:00Z",
      publishedAt: "2026-08-01T00:00:00Z",
    };
    const imported = parseFormationContentImport(serializeFormationContentExport([source]));
    expect(imported[0].publicationStatus).toBe("draft");
    expect(imported[0].theologicalReviewStatus).toBe("pending");
    expect(imported[0].reviewer).toBeNull();
  });

  it("seeds every requested representative category as unpublished review work", () => {
    const stableIds = new Set(REPRESENTATIVE_FORMATION_CONTENT_SEED.map((item) => item.stableId));
    for (const required of ["read-along.chapter-1", "day.1.scripture", "day.2.prayer", "day.25.review", "day.26.transition", "day.27.integrity", "day.50.recovery", "day.51.transition", "day.52.service", "day.75.completion", "recovery.win.sample", "service.weekly.sample", "review.weekly.sample", "completion.sample"]) {
      expect(stableIds.has(required)).toBe(true);
    }
    expect(REPRESENTATIVE_FORMATION_CONTENT_SEED.filter((item) => item.contentType === "witness_act" || item.contentType === "witness_evidence")).toHaveLength(5);
    expect(REPRESENTATIVE_FORMATION_CONTENT_SEED.filter((item) => item.stableId.startsWith("circuit."))).toHaveLength(5);
    expect(REPRESENTATIVE_FORMATION_CONTENT_SEED.every((item) => item.publicationStatus === "draft" && item.theologicalReviewStatus === "pending")).toBe(true);
  });
});

