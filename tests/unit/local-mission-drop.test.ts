import { describe, expect, it } from "vitest";

import { formatMissionDropEmail } from "@/lib/missionDropEmail";
import {
  completeLocalMission,
  DEFAULT_LOCAL_MISSION_PREFERENCES,
  generateLocalMission,
  getLocalMissionProofCopy,
  normalizeLocalMissionPreferences,
  selectMockLocalSignal,
  type LocalMissionPreferences,
  type MockLocalSignal,
} from "@/lib/localMissionDrop";
import type { ControllableType } from "@/components/ControllableCard";

const enabledChicagoPreferences: LocalMissionPreferences = {
  city: "Chicago",
  state: "Illinois",
  localMissionsEnabled: true,
  localMissionVisibility: "private",
  showCityOnShareCards: false,
};

const testDate = new Date("2026-06-17T12:00:00");

describe("local mission drop", () => {
  it("uses privacy-safe local mission preference defaults", () => {
    expect(DEFAULT_LOCAL_MISSION_PREFERENCES).toEqual({
      city: "",
      state: "",
      localMissionsEnabled: false,
      localMissionVisibility: "private",
      showCityOnShareCards: false,
    });
    expect(normalizeLocalMissionPreferences({ localMissionVisibility: "public", showCityOnShareCards: true })).toMatchObject({
      localMissionsEnabled: false,
      localMissionVisibility: "public",
      showCityOnShareCards: true,
    });
  });

  it("does not generate a local mission when local missions are disabled", () => {
    expect(
      generateLocalMission({
        preferences: DEFAULT_LOCAL_MISSION_PREFERENCES,
        signal: "sunny",
        date: testDate,
      }),
    ).toBeNull();
  });

  it("generates a local mission when local missions are enabled", () => {
    const mission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal: "sunny",
      date: testDate,
    });

    expect(mission).toMatchObject({
      id: "local-2026-06-17-chicago-sunny",
      type: "local",
      city: "Chicago",
      state: "Illinois",
      localSignalType: "weather",
      targetControllable: "wellness",
      title: "Chicago Mission",
      completed: false,
      completedAt: null,
      xpReward: 30,
      selfTrustReward: 10,
    });
  });

  it.each<[MockLocalSignal, ControllableType]>([
    ["sunny", "wellness"],
    ["rainy", "perspective"],
    ["cold", "wellness"],
    ["farmers_market", "wellness"],
    ["volunteer_opportunity", "environment"],
    ["sports_game_day", "environment"],
    ["community_gathering", "environment"],
    ["major_city_event", "perspective"],
    ["generic_city_day", "awareness"],
  ])("maps %s to %s", (signal, controllable) => {
    const mission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal,
      date: testDate,
    });

    expect(mission?.targetControllable).toBe(controllable);
  });

  it("selects mock local signals deterministically from city, state, and date", () => {
    expect(selectMockLocalSignal({ city: "Chicago", state: "Illinois", date: testDate })).toBe(
      selectMockLocalSignal({ city: "Chicago", state: "Illinois", date: testDate }),
    );
    expect(selectMockLocalSignal({ city: "Chicago", state: "Illinois", date: testDate })).not.toBe(
      selectMockLocalSignal({ city: "Austin", state: "Texas", date: testDate }),
    );
  });

  it("keeps city and state off proof copy by default", () => {
    const mission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal: "sunny",
      date: testDate,
    });
    expect(mission).not.toBeNull();

    const copy = getLocalMissionProofCopy(mission!, enabledChicagoPreferences);

    expect(copy).toEqual({
      title: "Local Mission Complete",
      body: "I charged Wellness today.",
    });
    expect(copy.title).not.toContain("Chicago");
    expect(copy.body).not.toContain("Chicago");
  });

  it("only shows city on share cards when visibility is public and city sharing is enabled", () => {
    const mission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal: "sunny",
      date: testDate,
    });
    expect(mission).not.toBeNull();

    const publicCopy = getLocalMissionProofCopy(mission!, {
      ...enabledChicagoPreferences,
      localMissionVisibility: "public",
      showCityOnShareCards: true,
    });
    const anonymousCopy = getLocalMissionProofCopy(mission!, {
      ...enabledChicagoPreferences,
      localMissionVisibility: "anonymous",
      showCityOnShareCards: true,
    });
    const privateCopy = getLocalMissionProofCopy(mission!, {
      ...enabledChicagoPreferences,
      localMissionVisibility: "private",
      showCityOnShareCards: true,
    });

    expect(publicCopy).toEqual({
      title: "Chicago Mission Complete",
      body: "I charged Wellness in Chicago today.",
    });
    expect(anonymousCopy.body).not.toContain("Chicago");
    expect(privateCopy.body).not.toContain("Chicago");
  });

  it("formats mission drop email without a local mission", () => {
    const email = formatMissionDropEmail({
      coreMission: {
        title: "Keep one honest promise",
        instruction: "Choose one promise small enough to finish.",
        xpReward: 25,
      },
      bonusMission: {
        title: "Bonus Mission",
        instruction: "Clear one point of friction.",
      },
      recoveryMission: {
        title: "Recovery Mission",
        instruction: "Return without making it a shame story.",
      },
    });

    expect(email.subject).toBe("Today's Training Drop");
    expect(email.text).toContain("Core Card");
    expect(email.text).toContain("Bonus Card");
    expect(email.text).toContain("Recovery Card");
    expect(email.text).not.toContain("Local Mission");
    expect(email.text).toContain("Train one Controllable. Earn XP. Build Self-Trust.");
    expect(email.text).toContain("Add proof to your Dex.");
    expect(email.text).toContain("Daily Charge: Control / Release / Move.");
    expect(email.text).toContain("Promise Ledger: keep or recover one promise.");
    expect(email.text).toContain("Proof Loop: add optional proof to your Dex.");
  });

  it("formats mission drop email with a short local mission section", () => {
    const localMission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal: "sunny",
      date: testDate,
    });
    expect(localMission).not.toBeNull();

    const email = formatMissionDropEmail({
      coreMission: {
        title: "Core Mission",
        instruction: "Keep the main promise.",
      },
      localMission,
    });

    expect(email.text).toContain("Chicago Mission Card");
    expect(email.text).toContain("Charge Wellness");
    expect(email.text).toContain("Get 10 minutes outside before sunset.");
    expect(email.text).toContain("+30 Wellness XP · +10 Self-Trust");
  });

  it("awards XP once when completing a local mission", () => {
    const mission = generateLocalMission({
      preferences: enabledChicagoPreferences,
      signal: "sunny",
      date: testDate,
    });
    expect(mission).not.toBeNull();

    const firstCompletion = completeLocalMission(mission!, "2026-06-17T18:00:00.000Z");
    const secondCompletion = completeLocalMission(firstCompletion.mission, "2026-06-17T19:00:00.000Z");

    expect(firstCompletion).toMatchObject({
      xpAwarded: 30,
      selfTrustAwarded: 10,
      alreadyCompleted: false,
    });
    expect(firstCompletion.mission).toMatchObject({
      completed: true,
      completedAt: "2026-06-17T18:00:00.000Z",
    });
    expect(secondCompletion).toMatchObject({
      xpAwarded: 0,
      selfTrustAwarded: 0,
      alreadyCompleted: true,
    });
    expect(secondCompletion.mission.completedAt).toBe("2026-06-17T18:00:00.000Z");
  });
});
