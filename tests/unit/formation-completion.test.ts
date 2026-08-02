import { describe, expect, it } from "vitest";
import {
  buildMilestoneSvg,
  buildPrivacySafeMilestone,
  createCompletionPreview,
  emptyClosingReflection,
  getCompletionCelebration,
  serializePrivateCompletionDownload,
} from "@/domain/formation/completion";

describe("formation completion privacy and copy", () => {
  it("celebrates practice without claiming earned salvation, approval, or maturity", () => {
    const copy = getCompletionCelebration("fully_charged_75").toLowerCase();
    expect(copy).toContain("did not earn god’s love");
    expect(copy).not.toContain("earned salvation");
    expect(copy).not.toContain("earned god’s approval");
    expect(copy).not.toContain("spiritually mature");
    expect(copy).not.toContain("better christian");
    expect(copy).not.toContain("guaranteed transformation");
  });

  it("builds a milestone from count-only fields and explicit public consent", () => {
    const record = createCompletionPreview("charge_40", new Date("2026-08-01T12:00:00Z"));
    const privateReflection = "A private relationship-with-Jesus reflection";
    const milestone = buildPrivacySafeMilestone(record, {
      includeName: false,
      displayName: "Private Name",
      includeQuote: true,
      selectedQuote: "A quote I selected for public sharing.",
    });

    expect(milestone.displayName).toBeUndefined();
    expect(milestone.selectedQuote).toBe("A quote I selected for public sharing.");
    expect(JSON.stringify(milestone)).not.toContain(privateReflection);
    expect(Object.keys(milestone).sort()).toEqual([
      "bookBranding",
      "completionDate",
      "controllableReps",
      "formationSeasonsCompleted",
      "formationTrack",
      "schemaVersion",
      "selectedQuote",
    ].sort());
  });

  it("escapes user-selected milestone text before creating SVG", () => {
    const milestone = buildPrivacySafeMilestone(createCompletionPreview("read_along"), {
      includeName: true,
      displayName: "<script>alert(1)</script>",
      includeQuote: true,
      selectedQuote: "Faith & practice",
    });
    const svg = buildMilestoneSvg(milestone);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("Faith &amp; practice");
  });

  it("keeps private download behavior separate from share-safe milestone behavior", () => {
    const record = createCompletionPreview("read_along");
    const answers = emptyClosingReflection();
    answers.relationshipWithJesus = "Private answer";
    const privateDownload = serializePrivateCompletionDownload(record, {
      recordId: record.id,
      answers,
      nextStep: "planned_recovery",
      updatedAt: new Date().toISOString(),
      localOnly: true,
    });
    const milestone = JSON.stringify(buildPrivacySafeMilestone(record, {
      includeName: false,
      displayName: "",
      includeQuote: false,
      selectedQuote: "",
    }));
    expect(privateDownload).toContain("Private answer");
    expect(milestone).not.toContain("Private answer");
  });
});

