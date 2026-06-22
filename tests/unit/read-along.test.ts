import { describe, expect, it } from "vitest";

import {
  READ_ALONG_SECTIONS,
  completeReadAlongRep,
  completeReadAlongSection,
  createReadAlongProgress,
  getReadAlongProgressPercent,
  getReadAlongStorageKey,
  getVisibleReadAlongSections,
  normalizeReadingStatus,
} from "@/lib/readAlong";

describe("read along progress", () => {
  it("normalizes reading status safely", () => {
    expect(normalizeReadingStatus("finished")).toBe("finished");
    expect(normalizeReadingStatus("unknown")).toBe("reading_now");
  });

  it("creates section-based progress from reading status", () => {
    const finished = createReadAlongProgress({ status: "finished" });
    const readingNow = createReadAlongProgress({ status: "reading_now" });

    expect(finished.currentSectionId).toBe("integration");
    expect(readingNow.currentSectionId).toBe("dashboard");
    expect(finished.completedSectionIds).toEqual([]);
  });

  it("keeps future sections spoiler-safe", () => {
    const progress = createReadAlongProgress({
      currentSectionId: "perspective",
      completedSectionIds: ["dashboard", "awareness"],
    });

    expect(getVisibleReadAlongSections(progress).map((section) => section.id)).toEqual([
      "dashboard",
      "awareness",
      "perspective",
    ]);
    expect(getVisibleReadAlongSections(progress).map((section) => section.id)).not.toContain("habit");
  });

  it("marks reps and sections idempotently", () => {
    const progress = createReadAlongProgress({
      currentSectionId: "awareness",
      startedAt: "2026-06-21T12:00:00.000Z",
    });

    const repDone = completeReadAlongRep(completeReadAlongRep(progress, "awareness"), "awareness");
    const sectionDone = completeReadAlongSection(
      completeReadAlongSection(repDone, "awareness", "2026-06-21T13:00:00.000Z"),
      "awareness",
      "2026-06-21T13:30:00.000Z",
    );

    expect(repDone.completedRepIds).toEqual(["awareness"]);
    expect(sectionDone.completedSectionIds).toEqual(["awareness"]);
    expect(sectionDone.currentSectionId).toBe("perspective");
  });

  it("calculates progress percent from completed sections", () => {
    const progress = createReadAlongProgress({
      completedSectionIds: ["dashboard", "awareness", "perspective", "habit"],
    });

    expect(getReadAlongProgressPercent(progress)).toBe(
      Math.round((4 / READ_ALONG_SECTIONS.length) * 100),
    );
  });

  it("uses a user-scoped local storage key", () => {
    expect(getReadAlongStorageKey("user-1")).toBe("read_along_progress_user-1");
    expect(getReadAlongStorageKey(null)).toBe("read_along_progress_guest");
  });
});
