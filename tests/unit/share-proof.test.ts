import { describe, expect, it } from "vitest";

import {
  buildDailyMoveSharePayload,
  buildResetProofSharePayload,
  buildShareProofPayload,
  getShareIdentityLine,
  isPrivacySafeSharePayload,
  shouldContributeToLocalBoard,
} from "@/lib/shareProof";

const REQUIRED_SAFE_LINES = [
  "I started tracking My Controllables.",
  "Today I charged Habit.",
  "Awareness Charged.",
  "Wellness Fully Charged.",
  "One kept promise at a time.",
  "Control the Controllables one day at a time.",
  "Returned from drift.",
  "The Continuous Upgrade continues.",
];

describe("share proof copy", () => {
  it("generates the required safe milestone lines", () => {
    const payloads = [
      buildShareProofPayload({ kind: "tracking_started" }),
      buildShareProofPayload({ kind: "controllable_charged", controllable: "habit" }),
      buildShareProofPayload({ kind: "charge_stage", controllable: "awareness", chargeStage: "charged" }),
      buildShareProofPayload({ kind: "charge_stage", controllable: "wellness", chargeStage: "fully charged" }),
      buildShareProofPayload({ kind: "kept_promises", keptPromises: 10 }),
      buildShareProofPayload({ kind: "returned_from_drift" }),
      buildShareProofPayload({ kind: "continuous_upgrade" }),
    ];
    const copy = payloads.map((payload) => `${payload.headline} ${payload.proofLine}`).join(" ");

    for (const line of REQUIRED_SAFE_LINES) {
      expect(copy).toContain(line);
    }
  });

  it("uses charge stage labels and controllable icons", () => {
    const awareness = buildShareProofPayload({
      kind: "charge_stage",
      controllable: "awareness",
      chargeStage: "charged",
      xp: 40,
      level: 2,
    });
    const wellness = buildShareProofPayload({
      kind: "charge_stage",
      controllable: "wellness",
      chargeStage: "fully charged",
      xp: 90,
      level: 3,
    });

    expect(awareness.headline).toBe("Awareness Charged.");
    expect(awareness.chargeStageLabel).toBe("Awareness Charged");
    expect(awareness.icon).toBe("🦉");
    expect(awareness.xpLabel).toBe("+40 XP");
    expect(awareness.levelLabel).toBe("Level 2");

    expect(wellness.headline).toBe("Wellness Fully Charged.");
    expect(wellness.chargeStageLabel).toBe("Wellness Fully Charged");
    expect(wellness.icon).toBe("🛰️");
  });

  it("maps daily move proof to charged Controllables", () => {
    expect(buildDailyMoveSharePayload("notice")).toMatchObject({
      headline: "Today I charged Awareness.",
      icon: "🦉",
      xpLabel: "+30 XP",
    });
    expect(buildDailyMoveSharePayload("prove")).toMatchObject({
      headline: "Today I charged Habit.",
      proofLine: "One kept promise at a time.",
      icon: "🦈",
      xpLabel: "+40 XP",
    });
    expect(buildDailyMoveSharePayload("fully_charged")).toMatchObject({
      headline: "Fully Charged.",
      proofLine: "Control the Controllables one day at a time.",
    });
  });

  it("falls back to tracking copy until a reset is complete", () => {
    expect(buildResetProofSharePayload({ completedDays: 3, xp: 60 })).toMatchObject({
      headline: "I started tracking My Controllables.",
      progressLabel: "3/7 days",
      xpLabel: "+60 XP",
    });
    expect(buildResetProofSharePayload({ completedDays: 7, xp: 210 })).toMatchObject({
      headline: "Completed the 7-Day Controllables Reset.",
      progressLabel: "7/7 days",
      xpLabel: "+210 XP",
    });
  });

  it("keeps share payloads privacy-safe", () => {
    const payloads = [
      buildShareProofPayload({ kind: "tracking_started" }),
      buildShareProofPayload({ kind: "controllable_charged", controllable: "habit", xp: 40 }),
      buildShareProofPayload({ kind: "charge_stage", controllable: "wellness", chargeStage: "fully charged" }),
      buildShareProofPayload({ kind: "kept_promises", keptPromises: 10 }),
      buildShareProofPayload({ kind: "returned_from_drift" }),
      buildResetProofSharePayload({ completedDays: 7, xp: 180 }),
    ];
    const allCopy = payloads.map((payload) => payload.shareText).join(" ");

    for (const payload of payloads) {
      expect(isPrivacySafeSharePayload(payload)).toBe(true);
    }
    expect(allCopy).not.toMatch(/reflection|journal|calendar|money|AI guidance|avoided promise|release text|reset vision/i);
    expect(allCopy).not.toMatch(/Scout|Seer|Watchman|Builder|Finisher|scout|translator|builder|protector|charger|evol|creature|monster|battle/i);
  });

  it("does not expose anonymous identity or location", () => {
    const payload = buildShareProofPayload({
      kind: "controllable_charged",
      controllable: "habit",
      visibility: "anonymous",
      handle: "@jb",
      city: "Austin",
      state: "TX",
      includeLocation: true,
    });

    expect(payload.identityLine).toBeNull();
    expect(payload.shareText).not.toMatch(/@jb|Austin|TX/);
    expect(getShareIdentityLine({ visibility: "anonymous", handle: "@jb", city: "Austin", state: "TX", includeLocation: true })).toBeNull();
  });

  it("keeps local board eligibility opt-in by visibility", () => {
    expect(shouldContributeToLocalBoard("private")).toBe(false);
    expect(shouldContributeToLocalBoard("anonymous")).toBe(true);
    expect(shouldContributeToLocalBoard("public")).toBe(true);
    expect(getShareIdentityLine({ visibility: "public", handle: "@jb", city: "Austin", state: "TX", includeLocation: false })).toBe("@jb");
    expect(getShareIdentityLine({ visibility: "public", handle: "@jb", city: "Austin", state: "TX", includeLocation: true })).toBe("@jb · Austin, TX");
  });
});
