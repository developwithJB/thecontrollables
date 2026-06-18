import { describe, expect, it } from "vitest";

import {
  buildStartingChargeProofCard,
  clearStartingChargeResult,
  getStartingChargeResult,
  isPrivacySafeStartingChargeProofCard,
  saveStartingChargeResult,
  scoreStartingCharge,
  type StartingChargeAnswers,
  type StorageLike,
} from "@/lib/startingCharge";

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

const baseAnswers: StartingChargeAnswers = {
  currentState: "clear",
  strongestControllable: "habit",
  needsChargeControllable: "wellness",
  egoSignal: "control",
  firstPromise: "drink_water",
};

describe("Starting Charge", () => {
  it("scores a deterministic starting profile from answers", () => {
    const result = scoreStartingCharge(baseAnswers);

    expect(result.strongestControllable).toBe("habit");
    expect(result.chargingControllable).toBe("wellness");
    expect(result.egoSignal).toBe("control");
    expect(result.firstMission).toMatchObject({
      id: "mission_001",
      title: "Protect the vessel",
      targetControllable: "wellness",
      instruction: "Drink water first.",
    });
    expect(result.chargePercentages.habit).toBeGreaterThan(result.chargePercentages.wellness);
    expect(result.startingSelfTrustLevel).toBe(1);
  });

  it("keeps current-state scoring explainable and clamped", () => {
    const tired = scoreStartingCharge({ ...baseAnswers, currentState: "tired" });
    const ready = scoreStartingCharge({ ...baseAnswers, currentState: "ready" });

    expect(tired.chargePercentages.wellness).toBeLessThan(ready.chargePercentages.wellness);
    for (const value of Object.values(tired.chargePercentages)) {
      expect(value).toBeGreaterThanOrEqual(8);
      expect(value).toBeLessThanOrEqual(96);
    }
  });

  it("builds a privacy-safe Starting Charge proof card", () => {
    const result = scoreStartingCharge(baseAnswers);
    const card = buildStartingChargeProofCard(result);

    expect(card.headline).toBe("I started tracking My Controllables.");
    expect(card.strongestLine).toBe("Strongest: Habit");
    expect(card.chargingLine).toBe("Charging: Wellness");
    expect(card.missionLine).toBe("Mission 001: Protect the vessel");
    expect(card.proofLine).toBe("Control the Controllables one day at a time.");
    expect(card.identityLine).toBeNull();
    expect(card.includeLocation).toBe(false);
    expect(isPrivacySafeStartingChargeProofCard(card)).toBe(true);
  });

  it("does not include a custom promise in share copy unless explicitly opted in", () => {
    const result = scoreStartingCharge({
      ...baseAnswers,
      firstPromise: "custom",
      customPromise: "Call Mom before lunch",
    });
    const defaultCard = buildStartingChargeProofCard(result);
    const optedInCard = buildStartingChargeProofCard(result, { includeCustomPromise: true });

    expect(defaultCard.shareText).not.toContain("Call Mom");
    expect(defaultCard.missionLine).toBe("Mission 001: Protect the vessel");
    expect(optedInCard.missionLine).toBe("Mission 001: Call Mom before lunch");
  });

  it("saves and clears local-first Starting Charge results", () => {
    const storage = createMemoryStorage();
    const result = scoreStartingCharge(baseAnswers);

    expect(getStartingChargeResult("user-1", storage)).toBeNull();
    saveStartingChargeResult("user-1", result, storage);
    expect(getStartingChargeResult("user-1", storage)?.chargingControllable).toBe("wellness");
    clearStartingChargeResult("user-1", storage);
    expect(getStartingChargeResult("user-1", storage)).toBeNull();
  });
});
