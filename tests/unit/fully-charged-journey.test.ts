import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CIRCUIT_TYPES } from "@/domain/formation/circuits";
import { validateFormationContent } from "@/domain/formation/content";
import { FULLY_CHARGED_75_CONTENT_SEED } from "@/domain/formation/contentSeed";
import {
  FULLY_CHARGED_75_DAY_GUIDES,
  FULLY_CHARGED_TOTAL_DAYS,
  addLocalCalendarDays,
  buildCompletedFullyChargedSimulation,
  evaluateFullyChargedAttempt,
  getFullyChargedDayGuide,
  getLocalDateInTimezone,
  seasonForFullyChargedDay,
  validateFullyChargedDayGuides,
} from "@/domain/formation/fullyChargedJourney";

describe("Fully Charged 75-day journey", () => {
  it("has complete, ordered, unique, nonblank copy for every day", () => {
    expect(FULLY_CHARGED_75_DAY_GUIDES).toHaveLength(FULLY_CHARGED_TOTAL_DAYS);
    expect(validateFullyChargedDayGuides()).toEqual([]);
    expect(new Set(FULLY_CHARGED_75_DAY_GUIDES.map((guide) => guide.stableId)).size).toBe(
      FULLY_CHARGED_TOTAL_DAYS,
    );
    for (let dayNumber = 1; dayNumber <= FULLY_CHARGED_TOTAL_DAYS; dayNumber += 1) {
      expect(getFullyChargedDayGuide(dayNumber)?.dayNumber).toBe(dayNumber);
    }
  });

  it("uses the three exact 25-day formation seasons", () => {
    expect(seasonForFullyChargedDay(1)).toBe("be_with_jesus");
    expect(seasonForFullyChargedDay(25)).toBe("be_with_jesus");
    expect(seasonForFullyChargedDay(26)).toBe("become_like_jesus");
    expect(seasonForFullyChargedDay(50)).toBe("become_like_jesus");
    expect(seasonForFullyChargedDay(51)).toBe("do_what_jesus_did");
    expect(seasonForFullyChargedDay(75)).toBe("do_what_jesus_did");
    expect(seasonForFullyChargedDay(0)).toBeNull();
    expect(seasonForFullyChargedDay(76)).toBeNull();
  });

  it("creates one valid, unpublished governed-content draft for every day", () => {
    expect(FULLY_CHARGED_75_CONTENT_SEED).toHaveLength(FULLY_CHARGED_TOTAL_DAYS);
    for (const [index, draft] of FULLY_CHARGED_75_CONTENT_SEED.entries()) {
      expect(draft.dayStart).toBe(index + 1);
      expect(draft.dayEnd).toBe(index + 1);
      expect(draft.formationTrack).toBe("fully_charged_75");
      expect(draft.publicationStatus).toBe("draft");
      expect(draft.theologicalReviewStatus).toBe("pending");
      expect(validateFormationContent(draft)).toEqual([]);
    }
  });

  it("keeps the documented 75-day copy ledger synchronized with the governed guides", () => {
    const recap = readFileSync(
      resolve(process.cwd(), "docs/christian-formation/fully-charged-75-day-recap.md"),
      "utf8",
    );
    expect(recap.match(/^## Day \d+ — /gm)).toHaveLength(FULLY_CHARGED_TOTAL_DAYS);
    for (const guide of FULLY_CHARGED_75_DAY_GUIDES) {
      expect(recap).toContain(`## Day ${guide.dayNumber} — ${guide.title}`);
      expect(recap).toContain(`- Scripture reference: ${guide.scriptureReference}`);
      expect(recap).toContain(`- Daily invitation: ${guide.invitation}`);
      expect(recap).toContain(`- Private reflection: ${guide.reflectionPrompt}`);
      expect(recap).toContain(`- Environment and service: ${guide.servicePrompt}`);
    }
  });

  it("completes only after 75 consecutive closed days with all five circuits", () => {
    const simulation = buildCompletedFullyChargedSimulation("2026-08-04");
    const evaluation = evaluateFullyChargedAttempt(simulation);

    expect(simulation).toHaveLength(75);
    expect(evaluation.status).toBe("completed");
    expect(evaluation.completedDays).toBe(75);
    expect(evaluation.completionEligible).toBe(true);
    expect(evaluation.dayEvaluations.every((day) => day.completedCircuits.length === CIRCUIT_TYPES.length)).toBe(true);
    expect(simulation[74].localDate).toBe("2026-10-17");
  });

  it("ends accurately when any one of the 75 days closes with a missing circuit", () => {
    for (let missedDay = 1; missedDay <= FULLY_CHARGED_TOTAL_DAYS; missedDay += 1) {
      const simulation = buildCompletedFullyChargedSimulation("2026-08-04").slice(0, missedDay);
      simulation[missedDay - 1] = {
        ...simulation[missedDay - 1],
        circuitStates: {
          ...simulation[missedDay - 1].circuitStates,
          environment: "in_progress",
        },
      };

      const evaluation = evaluateFullyChargedAttempt(simulation);
      expect(evaluation.status, `missed day ${missedDay}`).toBe("ended");
      expect(evaluation.endedOnDay, `missed day ${missedDay}`).toBe(missedDay);
      expect(evaluation.completedDays, `missed day ${missedDay}`).toBe(missedDay - 1);
      expect(evaluation.completionEligible, `missed day ${missedDay}`).toBe(false);
    }
  });

  it("keeps an unclosed partial day active and reports its missing circuits", () => {
    const simulation = buildCompletedFullyChargedSimulation("2026-08-04").slice(0, 10);
    simulation[9] = {
      ...simulation[9],
      closed: false,
      circuitStates: { awareness: "complete", perspective: "complete" },
    };

    const evaluation = evaluateFullyChargedAttempt(simulation);
    expect(evaluation.status).toBe("active");
    expect(evaluation.currentDay).toBe(10);
    expect(evaluation.completedDays).toBe(9);
    expect(evaluation.dayEvaluations[9].missingCircuits).toEqual(["habit", "wellness", "environment"]);
  });

  it("rejects duplicate, skipped, and out-of-range day histories", () => {
    const first = buildCompletedFullyChargedSimulation("2026-08-04")[0];
    expect(() => evaluateFullyChargedAttempt([first, first])).toThrow(/Duplicate/);
    expect(() => evaluateFullyChargedAttempt([{ ...first, dayNumber: 2 }])).toThrow(/consecutive/);
    expect(() => evaluateFullyChargedAttempt([{ ...first, dayNumber: 76 }])).toThrow(/between 1 and 75/);
  });

  it("uses calendar-date arithmetic across leap day and month boundaries", () => {
    expect(addLocalCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addLocalCalendarDays("2028-02-28", 2)).toBe("2028-03-01");
    expect(addLocalCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("pins the practice date to the attempt timezone when the user travels", () => {
    const instant = new Date("2026-08-05T02:30:00.000Z");
    expect(getLocalDateInTimezone("America/Los_Angeles", instant)).toBe("2026-08-04");
    expect(getLocalDateInTimezone("UTC", instant)).toBe("2026-08-05");
  });
});
