import { describe, expect, it } from "vitest";

import { completeLocalMission, generateLocalMission, type LocalMissionPreferences } from "@/lib/localMissionDrop";
import {
  createDexProofEntry,
  deleteDexProofEntry,
  getDexCategorySummaries,
  getDexShareText,
  getDexStats,
} from "@/lib/controllablesDex";

const localMissionPreferences: LocalMissionPreferences = {
  city: "Chicago",
  state: "Illinois",
  localMissionsEnabled: true,
  localMissionVisibility: "private",
  showCityOnShareCards: false,
};

describe("controllables dex photo proof", () => {
  it("creates a photo proof entry with exact location storage disabled", () => {
    const entry = createDexProofEntry({
      id: "proof-1",
      userId: "user-1",
      missionId: "mission-1",
      targetControllable: "habit",
      imageUrl: "data:image/jpeg;base64,proof",
      capturedAt: "2026-06-17T18:00:00.000Z",
      city: "Chicago",
      state: "Illinois",
      caption: "Kept the promise",
    });

    expect(entry).toMatchObject({
      id: "proof-1",
      userId: "user-1",
      missionId: "mission-1",
      targetControllable: "habit",
      imageUrl: "data:image/jpeg;base64,proof",
      capturedAt: "2026-06-17T18:00:00.000Z",
      city: "Chicago",
      state: "Illinois",
      exactLocationStored: false,
      caption: "Kept the promise",
      visibility: "private",
    });
  });

  it("defaults photo proof visibility to private", () => {
    const entry = createDexProofEntry({
      missionId: "mission-1",
      targetControllable: "awareness",
      imageUrl: "data:image/jpeg;base64,proof",
    });

    expect(entry.visibility).toBe("private");
    expect(entry.shareSafePayload.exactLocationStored).toBe(false);
  });

  it("keeps exact location, city, and caption out of share payloads by default", () => {
    const entry = createDexProofEntry({
      missionId: "mission-1",
      targetControllable: "wellness",
      imageUrl: "data:image/jpeg;base64,proof",
      city: "Chicago",
      state: "Illinois",
      caption: "Private wellness detail",
      visibility: "public",
    });

    expect(entry.shareSafePayload).toMatchObject({
      title: "Mission Complete.",
      body: "I charged Wellness today.",
      footer: "Control the Controllables one day at a time.",
      exactLocationStored: false,
      captionIncluded: false,
    });
    expect(entry.shareSafePayload.city).toBeUndefined();
    expect(entry.shareSafePayload.caption).toBeUndefined();
    expect(getDexShareText(entry)).not.toContain("Chicago");
    expect(getDexShareText(entry)).not.toContain("Private wellness detail");
  });

  it("only includes city/state in share payload when explicitly enabled with public visibility", () => {
    const privateEntry = createDexProofEntry({
      missionId: "mission-1",
      targetControllable: "environment",
      imageUrl: "data:image/jpeg;base64,proof",
      city: "Chicago",
      state: "Illinois",
      visibility: "private",
      showCityOnShareCards: true,
    });
    const publicEntry = createDexProofEntry({
      missionId: "mission-1",
      targetControllable: "environment",
      imageUrl: "data:image/jpeg;base64,proof",
      city: "Chicago",
      state: "Illinois",
      visibility: "public",
      showCityOnShareCards: true,
    });

    expect(privateEntry.shareSafePayload.body).toBe("I charged Environment today.");
    expect(publicEntry.shareSafePayload.body).toBe("I charged Environment in Chicago today.");
    expect(publicEntry.shareSafePayload.city).toBe("Chicago");
  });

  it("counts proof by Controllable", () => {
    const entries = [
      createDexProofEntry({
        id: "proof-1",
        missionId: "mission-1",
        targetControllable: "habit",
        imageUrl: "data:image/jpeg;base64,proof",
      }),
      createDexProofEntry({
        id: "proof-2",
        missionId: "mission-2",
        targetControllable: "habit",
        imageUrl: "data:image/jpeg;base64,proof",
      }),
      createDexProofEntry({
        id: "proof-3",
        missionId: "mission-3",
        targetControllable: "perspective",
        imageUrl: "data:image/jpeg;base64,proof",
      }),
    ];

    const stats = getDexStats(entries);

    expect(stats.totalProofCount).toBe(3);
    expect(stats.missionProofCount).toBe(3);
    expect(stats.countsByControllable.habit).toBe(2);
    expect(stats.countsByControllable.perspective).toBe(1);
    expect(stats.countsByControllable.wellness).toBe(0);
  });

  it("provides Dex empty states for each Controllable", () => {
    const wellness = getDexCategorySummaries([]).find((category) => category.controllable === "wellness");

    expect(wellness).toMatchObject({
      emptyTitle: "No Wellness proof yet",
      emptyDescription: "Complete a Wellness mission to add your first proof.",
      proofCount: 0,
    });
  });

  it("deletes proof entries locally", () => {
    const entries = [
      createDexProofEntry({
        id: "proof-1",
        missionId: "mission-1",
        targetControllable: "habit",
        imageUrl: "data:image/jpeg;base64,proof",
      }),
      createDexProofEntry({
        id: "proof-2",
        missionId: "mission-2",
        targetControllable: "wellness",
        imageUrl: "data:image/jpeg;base64,proof",
      }),
    ];

    expect(deleteDexProofEntry(entries, "proof-1").map((entry) => entry.id)).toEqual(["proof-2"]);
  });

  it("does not award XP from adding photo proof", () => {
    const mission = generateLocalMission({
      preferences: localMissionPreferences,
      signal: "sunny",
      date: new Date("2026-06-17T12:00:00"),
    });
    expect(mission).not.toBeNull();

    const completed = completeLocalMission(mission!, "2026-06-17T18:00:00.000Z");
    const proof = createDexProofEntry({
      missionId: completed.mission.id,
      targetControllable: completed.mission.targetControllable,
      imageUrl: "data:image/jpeg;base64,proof",
    });

    expect(completed.xpAwarded).toBe(30);
    expect(Object.hasOwn(proof, "xp")).toBe(false);
    expect(Object.hasOwn(proof, "xpReward")).toBe(false);
  });

  it("does not change mission completion idempotency when photo proof is added", () => {
    const mission = generateLocalMission({
      preferences: localMissionPreferences,
      signal: "sunny",
      date: new Date("2026-06-17T12:00:00"),
    });
    expect(mission).not.toBeNull();

    const firstCompletion = completeLocalMission(mission!, "2026-06-17T18:00:00.000Z");
    createDexProofEntry({
      missionId: firstCompletion.mission.id,
      targetControllable: firstCompletion.mission.targetControllable,
      imageUrl: "data:image/jpeg;base64,proof",
    });
    const secondCompletion = completeLocalMission(firstCompletion.mission, "2026-06-17T19:00:00.000Z");

    expect(secondCompletion).toMatchObject({
      xpAwarded: 0,
      selfTrustAwarded: 0,
      alreadyCompleted: true,
    });
    expect(secondCompletion.mission.completedAt).toBe("2026-06-17T18:00:00.000Z");
  });
});
