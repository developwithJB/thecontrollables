import { describe, expect, it } from "vitest";

import {
  buildControllableCardShareText,
  buildControllableTrainingCard,
  isPrivacySafeControllableCardShareText,
} from "@/lib/controllableCards";

describe("Controllable training cards", () => {
  it("builds a shareable card with level, rarity, XP, charge stage, and stats", () => {
    const card = buildControllableTrainingCard({
      type: "habit",
      level: 4,
      progress: 0.48,
      totalXp: 420,
    });

    expect(card).toMatchObject({
      id: "habit",
      cardNumber: "003",
      name: "Habit",
      icon: "🦈",
      level: 4,
      rarity: "Rare",
      stageLabel: "Habit Charged",
      xp: 420,
      progressPercent: 48,
    });
    expect(card.stats).toHaveLength(3);
    expect(card.stats.map((stat) => stat.label)).toEqual([
      "Integrity",
      "Consistency",
      "Follow-Through",
    ]);
    expect(card.shareText).toContain("Habit Card");
    expect(card.shareText).toContain("Level 4 · Rare");
    expect(card.shareText).toContain("420 XP · 48% charged");
    expect(isPrivacySafeControllableCardShareText(card.shareText)).toBe(true);
  });

  it("marks first-time cards as Starter without private data", () => {
    const card = buildControllableTrainingCard({
      type: "awareness",
      level: 1,
      progress: 0,
      totalXp: 0,
    });

    expect(card.rarity).toBe("Starter");
    expect(card.stageLabel).toBe("Awareness");
    expect(card.shareText).not.toMatch(/private reflections?|journal|calendar|money|ai guidance|gps|caption/i);
  });

  it("can produce explicit share text from a safe card payload", () => {
    const card = buildControllableTrainingCard({
      type: "wellness",
      level: 12,
      progress: 0.92,
      totalXp: 3_900,
    });
    const shareText = buildControllableCardShareText(card);

    expect(card.rarity).toBe("Fully Charged");
    expect(shareText).toContain("Wellness Card");
    expect(shareText).toContain("Fully Charged");
    expect(shareText).toContain("The Dashboard");
    expect(isPrivacySafeControllableCardShareText(shareText)).toBe(true);
  });
});

