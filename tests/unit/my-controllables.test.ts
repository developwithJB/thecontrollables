import { describe, expect, it } from "vitest";

import {
  createProofEntry,
  createStartingReadResult,
  DEFAULT_MY_CONTROLLABLES_PROFILE,
  getDailyTrainingPlan,
  getLocalBoards,
  getProofCards,
  getProofShareText,
  getSelfTrustStats,
  type MyControllablesProfile,
} from "@/lib/myControllables";

describe("my controllables local proof", () => {
  it("creates a starting read with book-aligned recommendations", () => {
    const result = createStartingReadResult({
      strongest: "awareness",
      growth: "habit",
      egoPattern: "all_or_nothing",
      avoidedPromise: "Walk for ten minutes",
      releaseGrip: "Other people's timelines",
      resetVision: "One honest promise each day",
    });

    expect(result.recommendedFirstPractice).toBe("Choose one small promise and finish it before the day ends.");
    expect(result.recommendedQuest).toBe("7-Day Reset: start with Habit");
    expect(result.shareText).toContain("Strongest right now: Awareness");
    expect(result.shareText).toContain("Current training focus: Habit");
  });

  it("scores Self-Trust from kept promises, recovery wins, starting read, and reset proof", () => {
    const assessment = createStartingReadResult({
      strongest: "perspective",
      growth: "wellness",
      egoPattern: "overcontrol",
      avoidedPromise: "",
      releaseGrip: "",
      resetVision: "",
    });
    const profile = makeProfile({
      assessment,
      resetCompletedAt: "2026-06-15T12:00:00.000Z",
      proofEntries: [
        createProofEntry({
          controllable: "wellness",
          promise: "Take a real lunch",
          kind: "kept_promise",
          date: new Date("2026-06-15T12:00:00"),
        }),
        createProofEntry({
          controllable: "habit",
          promise: "Return after drift",
          kind: "recovery_win",
          date: new Date("2026-06-14T12:00:00"),
        }),
      ],
    });

    const stats = getSelfTrustStats(profile, new Date("2026-06-15T12:00:00"));

    expect(stats.totalXp).toBe(150);
    expect(stats.level).toBe(2);
    expect(stats.levelProgress).toBe(50);
    expect(stats.keptPromises).toBe(1);
    expect(stats.recoveryWins).toBe(1);
    expect(stats.questsCompleted).toBe(1);
    expect(stats.todayEntry?.promise).toBe("Take a real lunch");
  });

  it("opens a recovery win only after drift, not after a normal yesterday", () => {
    const assessment = createStartingReadResult({
      strongest: "habit",
      growth: "habit",
      egoPattern: "avoidance",
      avoidedPromise: "",
      releaseGrip: "",
      resetVision: "",
    });
    const olderPractice = makeProfile({
      assessment,
      proofEntries: [
        {
          id: "older",
          date: "2026-06-12",
          createdAt: "2026-06-12T12:00:00.000Z",
          controllable: "habit",
          promise: "One clean task",
          kind: "kept_promise",
          xp: 25,
        },
      ],
    });
    const yesterdayPractice = makeProfile({
      assessment,
      proofEntries: [
        {
          id: "yesterday",
          date: "2026-06-14",
          createdAt: "2026-06-14T12:00:00.000Z",
          controllable: "habit",
          promise: "One clean task",
          kind: "kept_promise",
          xp: 25,
        },
      ],
    });

    expect(getSelfTrustStats(olderPractice, new Date("2026-06-15T12:00:00")).recoveryAvailable).toBe(true);
    expect(getSelfTrustStats(yesterdayPractice, new Date("2026-06-15T12:00:00")).recoveryAvailable).toBe(false);
  });

  it("unlocks proof cards without exposing local identity while private", () => {
    const assessment = createStartingReadResult({
      strongest: "environment",
      growth: "perspective",
      egoPattern: "comparison",
      avoidedPromise: "",
      releaseGrip: "",
      resetVision: "",
    });
    const profile = makeProfile({
      assessment,
      participation: {
        city: "Chicago",
        state: "Illinois",
        handle: "starter",
        visibility: "private",
      },
      proofEntries: Array.from({ length: 10 }, (_, index) =>
        createProofEntry({
          controllable: "habit",
          promise: `Promise ${index + 1}`,
          kind: "kept_promise",
          date: new Date(2026, 5, index + 1, 12),
        }),
      ),
    });

    const cards = getProofCards(profile);
    const tenPromises = cards.find((card) => card.id === "ten_promises");
    const localContribution = cards.find((card) => card.id === "local_contribution");
    const shareText = getProofShareText(profile, cards[0]);

    expect(tenPromises?.unlocked).toBe(true);
    expect(localContribution?.unlocked).toBe(false);
    expect(shareText).not.toContain("Chicago");
    expect(shareText).not.toContain("Illinois");
  });

  it("derives proof card copy from safe fields instead of stored private text", () => {
    const assessment = {
      ...createStartingReadResult({
        strongest: "awareness",
        growth: "habit",
        egoPattern: "approval",
        avoidedPromise: "Private promise",
        releaseGrip: "Private release",
        resetVision: "Private reset",
      }),
      shareText: "Private promise Private release Private reset",
    };
    const cards = getProofCards(makeProfile({ assessment }));

    expect(cards[0].body).toContain("Strongest right now: Awareness");
    expect(cards[0].body).toContain("Current training focus: Habit");
    expect(cards[0].body).not.toContain("Private promise");
    expect(cards[0].body).not.toContain("Private release");
    expect(cards[0].body).not.toContain("Private reset");
  });

  it("keeps local board contribution off until city or state sharing is opted in", () => {
    const privateProfile = makeProfile({
      participation: {
        city: "Chicago",
        state: "Illinois",
        handle: "starter",
        visibility: "private",
      },
      proofEntries: [
        createProofEntry({
          controllable: "habit",
          promise: "One small promise",
          kind: "kept_promise",
          date: new Date("2026-06-15T12:00:00"),
        }),
      ],
    });
    const anonymousProfile = makeProfile({
      ...privateProfile,
      participation: {
        ...privateProfile.participation,
        visibility: "anonymous",
      },
    });

    expect(getLocalBoards(privateProfile).every((board) => board.yourContribution === 0)).toBe(true);
    expect(getLocalBoards(privateProfile)[0].scope).toBe("Local opt-in off");
    expect(getLocalBoards(anonymousProfile)[0]).toMatchObject({
      scope: "Chicago",
      yourContribution: 1,
    });
  });

  it("allows anonymous local participation without exposing city, state, or handle in share text", () => {
    const profile = makeProfile({
      participation: {
        city: "Chicago",
        state: "Illinois",
        handle: "starter",
        visibility: "anonymous",
      },
    });
    const shareText = getProofShareText(profile, {
      id: "local_contribution",
      eyebrow: "Local Proof",
      title: "Represented your city or state",
      body: "Your public proof shares contribution, not private reflection.",
      unlocked: true,
    });

    expect(shareText).toContain("anonymous participation");
    expect(shareText).not.toContain("Chicago");
    expect(shareText).not.toContain("Illinois");
    expect(shareText).not.toContain("starter");
  });

  it("uses the growth controllable and avoided promise for daily training", () => {
    const assessment = createStartingReadResult({
      strongest: "awareness",
      growth: "environment",
      egoPattern: "approval",
      avoidedPromise: "Clean up the desk",
      releaseGrip: "",
      resetVision: "",
    });
    const plan = getDailyTrainingPlan(makeProfile({ assessment }), new Date("2026-06-15T12:00:00"));

    expect(plan.controllable).toBe("environment");
    expect(plan.promise).toBe("Clean up the desk");
    expect(plan.recoveryPrompt).toContain("Environment");
  });
});

function makeProfile(overrides: Partial<MyControllablesProfile> = {}): MyControllablesProfile {
  return {
    ...DEFAULT_MY_CONTROLLABLES_PROFILE,
    ...overrides,
    participation: {
      ...DEFAULT_MY_CONTROLLABLES_PROFILE.participation,
      ...overrides.participation,
    },
    proofEntries: overrides.proofEntries ?? [],
    joinedChallengeIds: overrides.joinedChallengeIds ?? [],
  };
}
