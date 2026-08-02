import { describe, expect, it } from "vitest";
import {
  FORMATION_EVENT_NAMES,
  validateFormationAnalyticsEvent,
  validateFormationExperiment,
} from "@/lib/formationAnalytics";

describe("privacy-safe formation analytics", () => {
  it("accepts every named lifecycle event with allowlisted aggregate properties", () => {
    for (const name of FORMATION_EVENT_NAMES) {
      expect(validateFormationAnalyticsEvent({ name, properties: { track: "read_along", count: 1 } })).toEqual({
        name,
        properties: { track: "read_along", count: 1 },
      });
    }
  });

  it("rejects sensitive or unsupported payload properties", () => {
    expect(() => validateFormationAnalyticsEvent({
      name: "circuit_completed",
      properties: { reflection_text: "private" } as never,
    })).toThrow(/Sensitive or unsupported/);
    expect(() => validateFormationAnalyticsEvent({
      name: "milestone_shared",
      properties: { source: "https://private-proof.example/file" },
    })).toThrow(/Unsafe/);
  });

  it("limits experiments to presentation and guidance timing", () => {
    expect(validateFormationExperiment({ id: "completion-layout", surface: "layout", variant: "compact" })).toMatchObject({ surface: "layout" });
    expect(() => validateFormationExperiment({ id: "strict-rules", surface: "completion_rules" as never, variant: "easier" })).toThrow(/cannot alter theology/);
  });
});

