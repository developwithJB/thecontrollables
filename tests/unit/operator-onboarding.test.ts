import { describe, expect, it } from "vitest";
import {
  OPERATOR_CONTROL_LEVELS,
  OPERATOR_DAY_TYPES,
  normalizeOperatorOnboardingAnswers,
} from "@/lib/operatorOnboarding";

describe("operator onboarding utilities", () => {
  it("defines the first-day option sets", () => {
    expect(OPERATOR_DAY_TYPES).toContain("Focus day");
    expect(OPERATOR_DAY_TYPES).toContain("Busy / chaotic");
    expect(OPERATOR_CONTROL_LEVELS).toContain("Survival mode");
  });

  it("normalizes valid answers", () => {
    const answers = normalizeOperatorOnboardingAnswers({
      dayType: "Low energy",
      controlLevel: "Some meetings",
      mattersToday: "  Prep for the client call  ",
      completedAt: "2026-05-02T12:00:00.000Z",
    });

    expect(answers).toEqual({
      dayType: "Low energy",
      controlLevel: "Some meetings",
      mattersToday: "Prep for the client call",
      completedAt: "2026-05-02T12:00:00.000Z",
    });
  });

  it("rejects incomplete or unknown answers", () => {
    expect(normalizeOperatorOnboardingAnswers({})).toBeNull();
    expect(normalizeOperatorOnboardingAnswers({
      dayType: "Anything day",
      controlLevel: "Full control",
      mattersToday: "Ship",
    })).toBeNull();
    expect(normalizeOperatorOnboardingAnswers({
      dayType: "Focus day",
      controlLevel: "Full control",
      mattersToday: " ",
    })).toBeNull();
  });
});
