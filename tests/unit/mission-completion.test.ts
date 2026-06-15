import { describe, expect, it } from "vitest";

import {
  addDevMockControllableXp,
  markDevMockDailyRing,
  readDevMockControllableXp,
  readDevMockDailyRings,
  type StorageLike,
} from "@/lib/devMockProgress";
import {
  applyMissionCompletionProgress,
  buildMissionCompletionActionText,
  buildMissionCompletionXpDescription,
  buildMissionSelfTrustDescription,
  isMissionCompletionAction,
} from "@/lib/missionCompletion";
import { buildMissionOfTheDay } from "@/lib/missionOfTheDay";

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
}

describe("mission completion", () => {
  it("builds deterministic idempotency copy", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "habit" });
    const actionText = buildMissionCompletionActionText(mission);

    expect(actionText).toBe("Mission of the Day: 2026-06-15: Charge Habit");
    expect(isMissionCompletionAction(actionText, mission)).toBe(true);
    expect(buildMissionCompletionXpDescription(mission)).toContain("Controllable XP");
    expect(buildMissionSelfTrustDescription(mission)).toContain("Self-Trust");
  });

  it("awards mission XP once and advances charge progress", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "habit" });
    const progress = applyMissionCompletionProgress(mission, 40, false);

    expect(progress.totalXp).toBe(80);
    expect(progress.type).toBe("habit");
    expect(progress.chargeStageLabel).toBe("Habit Charged");
    expect(progress.nextChargeStageLabel).toBe("Habit Fully Charged");
  });

  it("does not add XP again for an already completed mission", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "wellness" });
    const first = applyMissionCompletionProgress(mission, 40, false);
    const second = applyMissionCompletionProgress(mission, first.totalXp, true);

    expect(first.totalXp).toBe(80);
    expect(second.totalXp).toBe(80);
  });

  it("updates local dev mock XP and daily ring state", () => {
    const storage = createMemoryStorage();

    expect(readDevMockControllableXp(storage).habit).toBeUndefined();
    expect(addDevMockControllableXp("habit", 40, storage)).toBe(40);
    expect(addDevMockControllableXp("habit", 40, storage)).toBe(80);

    markDevMockDailyRing(
      "00000000-0000-4000-8000-000000000001",
      "2026-06-15",
      "habit",
      "Keep one small promise before noon.",
      storage,
    );

    const rings = readDevMockDailyRings(
      "00000000-0000-4000-8000-000000000001",
      "2026-06-15",
      storage,
    );

    expect(rings.prove_completed).toBe(true);
    expect(rings.prove_response).toBe("Keep one small promise before noon.");
  });
});
