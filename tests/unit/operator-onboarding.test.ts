import { describe, expect, it } from "vitest";
import {
  OPERATOR_CONTROL_LEVELS,
  OPERATOR_DAY_TYPES,
  OPERATOR_PROTECTION_FOCUS_OPTIONS,
  normalizeOperatorOnboardingAnswers,
} from "@/lib/operatorOnboarding";

describe("operator onboarding utilities", () => {
  it("defines the first-day option sets", () => {
    expect(OPERATOR_DAY_TYPES).toContain("Focus day");
    expect(OPERATOR_DAY_TYPES).toContain("Busy / chaotic");
    expect(OPERATOR_CONTROL_LEVELS).toContain("Survival mode");
    expect(OPERATOR_PROTECTION_FOCUS_OPTIONS).toEqual([
      "Focus",
      "Energy",
      "Confidence",
      "Relationships",
      "Time",
      "Peace",
    ]);
  });

  it("normalizes valid new answers", () => {
    const answers = normalizeOperatorOnboardingAnswers({
      dayType: "Low energy",
      controlLevel: "Full control",
      mattersToday: "  Prep for the client call  ",
      protectFocus: "Energy",
      completedAt: "2026-05-02T12:00:00.000Z",
    });

    expect(answers).toEqual({
      dayType: "Low energy",
      controlLevel: "Full control",
      mattersToday: "Prep for the client call",
      protectFocus: "Energy",
      completedAt: "2026-05-02T12:00:00.000Z",
    });
  });

  it("keeps old saved answers valid when protect focus is missing", () => {
    const answers = normalizeOperatorOnboardingAnswers({
      dayType: "Reset day",
      controlLevel: "Some meetings",
      mattersToday: "Reset my routine",
      completedAt: "2026-05-02T12:00:00.000Z",
    });

    expect(answers).toEqual({
      dayType: "Reset day",
      controlLevel: "Some meetings",
      mattersToday: "Reset my routine",
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
      protectFocus: "Noise",
      mattersToday: "Ship",
    })).toBeNull();
    expect(normalizeOperatorOnboardingAnswers({
      dayType: "Focus day",
      controlLevel: "Full control",
      mattersToday: " ",
    })).toBeNull();
  });
});
