import { describe, expect, it } from "vitest";
import { createEmptyCircuitDraft } from "@/domain/formation/circuits";
import {
  createCircuitIdempotencyKey,
  evaluateCircuit,
  getRequiredActionIds,
} from "@/domain/formation/circuitRules";

describe("formation circuit rules", () => {
  it("keeps Read Along low pressure and records one meaningful practice", () => {
    const draft = createEmptyCircuitDraft();
    draft.actions.scripture_opened = true;

    const result = evaluateCircuit("read_along", "awareness", draft);

    expect(result.state).toBe("recorded");
    expect(result.isSatisfiedForTrack).toBe(true);
    expect(result.requiredActionIds).toEqual([]);
  });

  it("records partial 40-Day Charge progress without pretending the circuit is complete", () => {
    const draft = createEmptyCircuitDraft();
    draft.actions.prayer_practiced = true;

    const result = evaluateCircuit("charge_40", "perspective", draft);

    expect(result.state).toBe("recorded");
    expect(result.isSatisfiedForTrack).toBe(true);
    expect(result.recordedCount).toBe(1);
    expect(result.totalCount).toBe(5);
    expect(result.statusDescription).toContain("Partial progress");
  });

  it("shows exact incomplete Fully Charged requirements with neutral state", () => {
    const result = evaluateCircuit("fully_charged_75", "awareness", createEmptyCircuitDraft());

    expect(result.state).toBe("not_started");
    expect(result.missingRequiredActionIds).toEqual([
      "scripture_opened",
      "reading_completed",
      "honest_truth_saved",
    ]);
    expect(result.statusDescription).toBe("3 required practices remain.");
  });

  it("completes strict Awareness when its three requirements are recorded", () => {
    const draft = createEmptyCircuitDraft();
    draft.actions.scripture_opened = true;
    draft.actions.reading_completed = true;
    draft.fields.honestTruth = "I am tired and need to slow down.";

    const result = evaluateCircuit("fully_charged_75", "awareness", draft);

    expect(result.state).toBe("complete");
    expect(result.missingRequiredActionIds).toEqual([]);
  });

  it("never completes the Main Promise from text or photo proof alone", () => {
    const draft = createEmptyCircuitDraft();
    draft.fields.mainPromise = "Call the person I said I would call.";
    draft.fields.textProof = "I have a note about it.";
    draft.proof = {
      id: "proof-1",
      storagePath: "user/proof-1.jpg",
      previewUrl: "signed-preview",
      createdAt: "2026-08-01T12:00:00.000Z",
      localOnly: false,
    };

    const result = evaluateCircuit("fully_charged_75", "habit", draft);

    expect(result.completedActionIds).toContain("main_promise_named");
    expect(result.completedActionIds).not.toContain("main_promise_completed");
    expect(result.isSatisfiedForTrack).toBe(false);
  });

  it("treats adapted movement as legitimate and accepts the indoor safety alternative", () => {
    const draft = createEmptyCircuitDraft();
    draft.actions.nutrition_covenant_honored = true;
    draft.actions.hydration_covenant_honored = true;
    draft.movement.one = {
      completed: true,
      description: "Rehabilitation plan",
      outdoors: false,
      adaptation: "rehabilitation",
    };
    draft.movement.two = {
      completed: true,
      description: "Indoor mobility during unsafe heat",
      outdoors: false,
      adaptation: "indoor_safety_alternative",
    };

    const result = evaluateCircuit("fully_charged_75", "wellness", draft);

    expect(result.completedActionIds).toContain("adapted_movement");
    expect(result.completedActionIds).toContain("outdoor_movement");
    expect(result.isSatisfiedForTrack).toBe(true);
  });

  it("requires service privately inside strict Environment v1", () => {
    expect(getRequiredActionIds("fully_charged_75", "environment")).toContain("service_completed");
    expect(getRequiredActionIds("charge_40", "environment")).toEqual([]);
  });

  it("creates a stable daily idempotency key", () => {
    const first = createCircuitIdempotencyKey("user-1", "2026-08-01", "charge_40", "habit");
    const retry = createCircuitIdempotencyKey("user-1", "2026-08-01", "charge_40", "habit");
    const otherCircuit = createCircuitIdempotencyKey("user-1", "2026-08-01", "charge_40", "wellness");

    expect(retry).toBe(first);
    expect(otherCircuit).not.toBe(first);
  });
});
