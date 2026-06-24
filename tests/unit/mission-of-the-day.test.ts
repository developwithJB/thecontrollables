import { describe, expect, it } from "vitest";

import {
  CONTROLLABLE_MISSION_TEMPLATES,
  MISSION_CONTROLLABLE_IDS,
  MISSION_DAY_MODES,
  buildDashboardRelaunchEmailPayload,
  buildDailyTrainingReengagementEmailPayload,
  buildMissionEmailPayload,
  buildMissionOfTheDay,
  buildMissionOfTheDayFromPlan,
  getFallbackControllableForDate,
  getMissionEmailPreview,
  getMissionEmailSubject,
  isPrivacySafeDashboardRelaunchEmailPayload,
  isPrivacySafeDailyTrainingReengagementEmailPayload,
  isPrivacySafeMissionEmailPayload,
} from "@/lib/missionOfTheDay";

const forbiddenEmailTerms = /private reflections?|money|calendar|journal|ai guidance|avoided promises?|release text|reset vision/i;

describe("Mission of the Day", () => {
  it("defines the five book-aligned sample missions", () => {
    expect(MISSION_CONTROLLABLE_IDS).toEqual([
      "awareness",
      "perspective",
      "habit",
      "wellness",
      "environment",
    ]);

    expect(Object.keys(CONTROLLABLE_MISSION_TEMPLATES)).toEqual([...MISSION_CONTROLLABLE_IDS]);
    expect(CONTROLLABLE_MISSION_TEMPLATES.habit).toMatchObject({
      missionTitle: "Charge Habit",
      missionInstruction: "Keep one small promise before noon.",
      shortWhy: "Consistency rewires the circuit.",
      xpReward: 40,
      selfTrustReward: 10,
    });
  });

  it("defines the daily mission day modes", () => {
    expect(MISSION_DAY_MODES).toEqual([
      "Recovery Day",
      "Focus Day",
      "Reset Day",
      "Momentum Day",
      "Build Day",
    ]);
  });

  it("generates a mission subject", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "habit" });

    expect(getMissionEmailSubject(mission)).toBe("Today's Training Drop: Charge Habit");
  });

  it("generates preview text from the mission move and reward", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "habit" });

    expect(getMissionEmailPreview(mission)).toBe("Train Habit: Keep one small promise before noon. +40 Habit XP.");
  });

  it("renders concise mission card copy", () => {
    const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable: "habit" });
    const payload = buildMissionEmailPayload(mission);

    expect(payload.text).toContain("Today's Training Drop");
    expect(payload.text).toContain("Card to train:");
    expect(payload.text).toContain("Charge Habit");
    expect(payload.text).toContain("Today's rep:");
    expect(payload.text).toContain("Why:");
    expect(payload.text).toContain("+40 Habit XP");
    expect(payload.text).toContain("+10 Self-Trust");
    expect(payload.text).toContain("Today's loop:");
    expect(payload.text).toContain("Daily Charge: Control / Release / Move.");
    expect(payload.text).toContain("Promise Ledger: keep or recover one promise.");
    expect(payload.text).toContain("Proof Loop: add optional proof to your Dex.");
    expect(payload.text).toContain("Control the Controllables one day at a time.");
    expect(payload.html).toContain("Today's Training Drop");
    expect(payload.html).toContain("Today's loop");
    expect(payload.html).toContain("Open The Dashboard");
  });

  it("keeps mission emails privacy-safe for every Controllable", () => {
    for (const targetControllable of MISSION_CONTROLLABLE_IDS) {
      const mission = buildMissionOfTheDay({ date: "2026-06-15", targetControllable });
      const payload = buildMissionEmailPayload(mission);
      const combined = [payload.subject, payload.previewText, payload.text, payload.html].join(" ");

      expect(isPrivacySafeMissionEmailPayload(payload)).toBe(true);
      expect(combined).not.toMatch(forbiddenEmailTerms);
    }
  });

  it("renders a privacy-safe relaunch email that sends users into new onboarding", () => {
    const payload = buildDashboardRelaunchEmailPayload({
      displayName: "Jordan",
      appCtaUrl: "https://thedashboard.agbcoaching.com/quick-start",
    });
    const combined = [payload.subject, payload.previewText, payload.text, payload.html].join(" ");

    expect(payload.subject).toBe("The new Dashboard is ready");
    expect(payload.text).toContain("Good morning Jordan");
    expect(payload.text).toContain("The book gave you the language. The app now gives you the reps.");
    expect(payload.text).toContain("Starting Charge");
    expect(payload.text).toContain("Daily Charge");
    expect(payload.text).toContain("My Controllables");
    expect(payload.text).toContain("Proof Dex");
    expect(payload.text).toContain("Start the new onboarding: https://thedashboard.agbcoaching.com/quick-start");
    expect(payload.html).toContain("Start the new onboarding");
    expect(isPrivacySafeDashboardRelaunchEmailPayload(payload)).toBe(true);
    expect(combined).not.toMatch(forbiddenEmailTerms);
  });

  it("renders a sticky re-engagement email when no Snapshot is active", () => {
    const payload = buildDailyTrainingReengagementEmailPayload({
      displayName: "JB",
      appCtaUrl: "https://thedashboard.agbcoaching.com/home",
      quickStartUrl: "https://thedashboard.agbcoaching.com/quick-start",
      levels: [
        { emoji: "🦉", label: "Awareness", level: 2 },
        { emoji: "🐢", label: "Perspective", level: 1 },
      ],
    });
    const combined = [payload.subject, payload.previewText, payload.text, payload.html].join(" ");

    expect(payload.subject).toBe("Today's Training Drop is ready");
    expect(payload.text).toContain("Good morning JB");
    expect(payload.text).toContain("You do not need a full Snapshot to train today.");
    expect(payload.text).toContain("Your Controllable Cards:");
    expect(payload.text).toContain("Awareness Lv.2");
    expect(payload.text).toContain("Daily Charge: Control / Release / Move.");
    expect(payload.text).toContain("Card Training: choose one Controllable to train.");
    expect(payload.text).toContain("Promise Ledger: keep or recover one promise.");
    expect(payload.text).toContain("Proof Loop: add optional proof to your Dex.");
    expect(payload.text).toContain("Start the 60-second Starting Charge");
    expect(payload.html).toContain("Pick one card. Do one rep.");
    expect(payload.html).toContain("Open today's training");
    expect(isPrivacySafeDailyTrainingReengagementEmailPayload(payload)).toBe(true);
    expect(combined).not.toContain("Your next Snapshot is waiting");
    expect(combined).not.toMatch(forbiddenEmailTerms);
  });

  it("falls back to a deterministic Controllable mission", () => {
    const date = "2026-06-15";
    const fallback = getFallbackControllableForDate(date);
    const mission = buildMissionOfTheDay({ date, targetControllable: "ego" });

    expect(mission.targetControllable).toBe(fallback);
    expect(mission.missionTitle).toBe(CONTROLLABLE_MISSION_TEMPLATES[fallback].missionTitle);
  });

  it("can derive the app mission from the same formatter as email", () => {
    const mission = buildMissionOfTheDayFromPlan({
      date: "2026-06-15",
      dayMode: "Recovery Day",
      guideInsights: [
        {
          guide_id: "wellness",
          confidence: "High",
          recommended_action: "Take one recovery action.",
          insight: "Keep it light. Protect the vessel.",
        },
      ],
      appCtaLabel: "Start Mission",
      appCtaUrl: "/home",
    });
    const payload = buildMissionEmailPayload({ ...mission, appCtaLabel: "Open The Dashboard" });

    expect(mission.targetControllable).toBe("wellness");
    expect(mission.missionTitle).toBe("Charge Wellness");
    expect(mission.missionInstruction).toBe("Take one recovery action.");
    expect(payload.subject).toBe("Today's Training Drop: Charge Wellness");
  });
});
