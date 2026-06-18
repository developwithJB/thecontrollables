import { describe, expect, it } from "vitest";

import {
  CONTROLLABLE_GUIDE_IDS,
  ORDERED_CONTROLLABLE_GUIDES,
  getControllableGuide,
  getControllableGuideClasses,
  isControllableGuideId,
  normalizeControllableGuideId,
} from "@/lib/controllables";
import {
  CONTROLLABLE_CHARGE_STAGES,
  getChargeStageLabel,
  getControllableChargeStage,
  getControllableChargeStageState,
  getNextChargeStage,
} from "@/lib/controllableRoster";

describe("controllables taxonomy", () => {
  it("keeps the canonical guide ordering", () => {
    expect(CONTROLLABLE_GUIDE_IDS).toEqual([
      "awareness",
      "perspective",
      "habit",
      "wellness",
      "environment",
    ]);
    expect(ORDERED_CONTROLLABLE_GUIDES.map((guide) => guide.name)).toEqual([
      "Awareness",
      "Perspective",
      "Habit",
      "Wellness",
      "Environment",
    ]);
  });

  it("returns guide metadata by id", () => {
    expect(getControllableGuide("awareness")).toMatchObject({
      name: "Awareness",
      emoji: "🦉",
      role: "See clearly",
      domain: "clarity / signals / patterns",
    });
    expect(getControllableGuide("environment")).toMatchObject({
      name: "Environment",
      emoji: "🚀",
      role: "Shape the space",
      domain: "surroundings / relationships / friction",
    });
  });

  it("normalizes and guards guide ids", () => {
    expect(isControllableGuideId("habit")).toBe(true);
    expect(isControllableGuideId("ego")).toBe(false);
    expect(normalizeControllableGuideId("wellness")).toBe("wellness");
    expect(normalizeControllableGuideId("ego", "perspective")).toBe("perspective");
  });

  it("exposes design-token classes for guide UI", () => {
    expect(getControllableGuideClasses("habit")).toMatchObject({
      bgClass: "bg-habit-soft",
      textClass: "text-habit",
    });
    expect(getControllableGuideClasses("awareness").cardClass).toContain("border-awareness");
  });
});

describe("controllable charge stages", () => {
  it("keeps exactly three charge stages", () => {
    expect(CONTROLLABLE_CHARGE_STAGES).toEqual(["base", "charged", "fully charged"]);
  });

  it("calculates charge stage thresholds", () => {
    expect(getControllableChargeStage(0, 0)).toBe("base");
    expect(getControllableChargeStage(0.33, 100)).toBe("base");
    expect(getControllableChargeStage(0.34, 100)).toBe("charged");
    expect(getControllableChargeStage(0.83, 100)).toBe("charged");
    expect(getControllableChargeStage(0.84, 100)).toBe("fully charged");
  });

  it("formats book-aligned display labels", () => {
    expect(getChargeStageLabel("awareness", "base")).toBe("Awareness");
    expect(getChargeStageLabel("awareness", "charged")).toBe("Awareness Charged");
    expect(getChargeStageLabel("awareness", "fully charged")).toBe("Awareness Fully Charged");
    expect(getChargeStageLabel("environment", "fully charged")).toBe("Environment Fully Charged");
  });

  it("calculates the next charge stage", () => {
    expect(getNextChargeStage("base")).toBe("charged");
    expect(getNextChargeStage("charged")).toBe("fully charged");
    expect(getNextChargeStage("fully charged")).toBeNull();
  });

  it("builds progress labels for level-up moments", () => {
    const wellness = getControllableChargeStageState({
      type: "wellness",
      level: 4,
      progress: 0.72,
      totalXp: 180,
    });

    expect(wellness.chargeStageLabel).toBe("Wellness Charged");
    expect(wellness.progressLabel).toContain("Wellness is 72% to Fully Charged");
    expect(wellness.nextChargeStageLabel).toBe("Wellness Fully Charged");

    const habit = getControllableChargeStageState({
      type: "habit",
      level: 5,
      progress: 0.91,
      totalXp: 240,
    });

    expect(habit.chargeStageLabel).toBe("Habit Fully Charged");
    expect(habit.nextChargeStage).toBeNull();
  });

  it("keeps milestone copy share-safe", () => {
    const copy = [
      getControllableChargeStageState({ type: "awareness", level: 1, progress: 0.2, totalXp: 20 }).shareMilestoneCopy,
      getControllableChargeStageState({ type: "habit", level: 2, progress: 0.4, totalXp: 80 }).shareMilestoneCopy,
      getControllableChargeStageState({ type: "wellness", level: 3, progress: 0.9, totalXp: 140 }).shareMilestoneCopy,
    ].join(" ");

    expect(copy).toContain("Control the Controllables one day at a time");
    expect(copy).toContain("The Continuous Upgrade");
    expect(copy).toContain("Living Fully Charged");
    expect(copy).not.toMatch(/evol|Scout|Seer|Watchman|Builder|Finisher|creature|monster|battle/i);
  });
});
