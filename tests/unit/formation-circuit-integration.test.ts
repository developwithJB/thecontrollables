import { describe, expect, it } from "vitest";
import { createEmptyCircuitDraft, type FormationCircuitEntry } from "@/domain/formation/circuits";
import { normalizeCircuitDraft, upsertFormationCircuitEntry } from "@/domain/formation/circuitSerialization";

function entry(overrides: Partial<FormationCircuitEntry> = {}): FormationCircuitEntry {
  return {
    id: "entry-1",
    userId: "user-1",
    localDate: "2026-08-01",
    track: "charge_40",
    circuit: "habit",
    ruleVersion: "formation-circuits-v1",
    completionState: "recorded",
    completedActionIds: ["main_promise_named"],
    missingRequiredActionIds: [],
    draft: createEmptyCircuitDraft(),
    idempotencyKey: "stable-key",
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    completedAt: "2026-08-01T08:00:00.000Z",
    localOnly: true,
    ...overrides,
  };
}

describe("formation circuit repository integration", () => {
  it("upserts a retry into one daily circuit record", () => {
    const original = entry();
    const retry = entry({
      id: original.id,
      completionState: "complete",
      completedActionIds: ["main_promise_named", "main_promise_completed"],
      updatedAt: "2026-08-01T09:00:00.000Z",
    });

    const result = upsertFormationCircuitEntry([original], retry);

    expect(result).toHaveLength(1);
    expect(result[0].completionState).toBe("complete");
    expect(result[0].idempotencyKey).toBe("stable-key");
  });

  it("preserves distinct circuit and day history", () => {
    const habit = entry();
    const wellness = entry({ id: "entry-2", circuit: "wellness", idempotencyKey: "wellness-key" });
    const tomorrow = entry({ id: "entry-3", localDate: "2026-08-02", idempotencyKey: "tomorrow-key" });

    expect(upsertFormationCircuitEntry([habit, wellness], tomorrow)).toHaveLength(3);
  });

  it("normalizes untrusted private payloads and caps text", () => {
    const normalized = normalizeCircuitDraft({
      actions: { prayer_practiced: true, malformed: "yes" },
      fields: { gratitude: "a".repeat(3000), unsafe: 12 },
      reflection: "r".repeat(5000),
      movement: { one: { completed: true, description: "Walk", adaptation: "walking" } },
      proof: { id: "missing-required-fields" },
    });

    expect(normalized.actions.prayer_practiced).toBe(true);
    expect(normalized.fields.gratitude).toHaveLength(2000);
    expect(normalized.reflection).toHaveLength(4000);
    expect(normalized.movement.one.adaptation).toBe("walking");
    expect(normalized.proof).toBeNull();
  });
});
