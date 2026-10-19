import { describe, expect, it } from "vitest";
import { createEmptyCircuitDraft } from "@/domain/formation/circuits";
import { evaluateCircuit } from "@/domain/formation/circuitRules";
import { restDayForDate } from "@/domain/formation/sabbath";

describe("versioned Sabbath Wellness", () => {
  const restDraft = () => {
    const draft = createEmptyCircuitDraft();
    draft.actions = { nutrition_covenant_honored: true, hydration_covenant_honored: true, rest_or_walk: true };
    draft.fields.restOrWalk = "Rested quietly and walked gently.";
    return draft;
  };
  it("completes only with v2 and a server-projected rest day", () => {
    expect(evaluateCircuit("fully_charged_75", "wellness", restDraft(), { rulesVersion: "v2_sabbath", isRestDay: true }).state).toBe("complete");
    for (const context of [undefined, { rulesVersion: "formation-circuits-v1", isRestDay: true }, { rulesVersion: "v2_sabbath", isRestDay: false }]) {
      const result = evaluateCircuit("fully_charged_75", "wellness", restDraft(), context);
      expect(result.state).toBe("in_progress");
      expect(result.completedActionIds).not.toContain("rest_or_walk");
      expect(result.requiredActionIds).toContain("movement_block_two");
    }
  });
  it("requires both an attestation and a bounded description", () => {
    const draft = restDraft();
    const context = { rulesVersion: "v2_sabbath", isRestDay: true };
    for (const description of [" ", "x".repeat(501)]) {
      draft.fields.restOrWalk = description;
      expect(evaluateCircuit("fully_charged_75", "wellness", draft, context).missingRequiredActionIds).toContain("rest_or_walk");
    }
    draft.fields.restOrWalk = "Rested";
    draft.actions.rest_or_walk = false;
    expect(evaluateCircuit("fully_charged_75", "wellness", draft, context).state).not.toBe("complete");
  });
  it("leaves other circuits required and low-pressure tracks unchanged", () => {
    const context = { rulesVersion: "v2_sabbath", isRestDay: true };
    expect(evaluateCircuit("fully_charged_75", "environment", restDraft(), context).requiredActionIds).toEqual(["friction_removed", "tomorrow_prepared", "service_completed"]);
    expect(evaluateCircuit("read_along", "wellness", restDraft(), context).requiredActionIds).toEqual([]);
  });
  it("uses the pinned local calendar date across DST and year boundaries", () => {
    expect(restDayForDate("2027-03-14", 0)).toBe(true);
    expect(restDayForDate("2027-11-07", 0)).toBe(true);
    expect(restDayForDate("2027-01-01", 0)).toBe(false);
    expect(restDayForDate(null, 0)).toBe(false);
    expect(restDayForDate("2027-01-01", 7)).toBe(false);
  });
});
