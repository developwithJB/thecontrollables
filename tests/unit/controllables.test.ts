import { describe, expect, it } from "vitest";

import {
  CONTROLLABLE_GUIDE_IDS,
  ORDERED_CONTROLLABLE_GUIDES,
  getControllableGuide,
  getControllableGuideClasses,
  isControllableGuideId,
  normalizeControllableGuideId,
} from "@/lib/controllables";

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
