import { describe, expect, it } from "vitest";

import {
  CONTROLLABLE_VISUAL_ICONS,
  getChargeMomentDisplay,
  getChargeProgressPercent,
  getControllableChargeVisual,
  getControllableVisualIcon,
} from "@/lib/controllableVisuals";

describe("controllable visual charge system", () => {
  it("maps each Controllable to the book character icon", () => {
    expect(CONTROLLABLE_VISUAL_ICONS).toEqual({
      awareness: "🦉",
      perspective: "🐢",
      habit: "🦈",
      wellness: "🛰️",
      environment: "🚀",
    });
    expect(getControllableVisualIcon("wellness")).toBe("🛰️");
  });

  it("returns the correct charge stage display label", () => {
    expect(getControllableChargeVisual({ type: "awareness", level: 1, progress: 0, totalXp: 0 })).toMatchObject({
      displayLabel: "Awareness",
      stateLabel: "Base",
    });
    expect(getControllableChargeVisual({ type: "habit", level: 2, progress: 0.5, totalXp: 90 })).toMatchObject({
      displayLabel: "Habit Charged",
      stateLabel: "Charged",
    });
    expect(getControllableChargeVisual({ type: "environment", level: 4, progress: 0.91, totalXp: 260 })).toMatchObject({
      displayLabel: "Environment Fully Charged",
      stateLabel: "Fully Charged",
      badgeLabel: "Fully Charged",
      ringPercent: 100,
    });
  });

  it("calculates a clamped visual progress percent", () => {
    expect(getChargeProgressPercent(0.724)).toBe(72);
    expect(getChargeProgressPercent(1.4)).toBe(100);
    expect(getChargeProgressPercent(-0.1)).toBe(0);
  });

  it("builds stage unlock display copy", () => {
    const moment = getChargeMomentDisplay({
      type: "habit",
      xpAwarded: 40,
      progress: 0.5,
      totalXp: 90,
      level: 2,
    });

    expect(moment).toMatchObject({
      icon: "🦈",
      title: "Habit Charged",
      rewardLabel: "+40 Habit XP",
      nextLabel: "Next: Habit Fully Charged",
      progressPercent: 50,
    });
  });
});
