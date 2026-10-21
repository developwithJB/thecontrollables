import { getResetDayNumber } from "@/lib/resetCalendar";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
import {
  recordPersonalAction,
  recordCircleAttendance,
  completeLegacyResetDay,
  awardLegacyPersonalEvent,
  awardWellnessMilestone,
} from "@/lib/personalProgress";
import { buildMissionOfTheDay } from "@/lib/missionOfTheDay";
import { getChargeMomentDisplay } from "@/lib/controllableVisuals";
import { getTodayDateKey } from "@/lib/covenant";
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({
    data: {
      id: "synthetic",
      xpAwarded: 15,
      selfTrustAwarded: 0,
      alreadyCompleted: false,
    },
    error: null,
  });
});
describe("server-owned legacy rewards", () => {
  it("sends an action, never a client-selected owner or amount", async () => {
    await recordPersonalAction({
      text: " honest practice ",
      controllable: "Awareness",
      kind: "personal",
      user_id: "spoof",
      xpAwarded: 99999,
    } as never);
    expect(mocks.rpc).toHaveBeenCalledWith("record_personal_action", {
      p_action_text: "honest practice",
      p_controllable: "awareness",
      p_kind: "personal",
    });
  });
  it("drops unknown controllables and validates returned rewards", async () => {
    await recordPersonalAction({ text: "record", controllable: "unknown" });
    expect(mocks.rpc.mock.calls[0][1].p_controllable).toBeNull();
    mocks.rpc.mockResolvedValue({
      data: { id: "synthetic", xpAwarded: 100000, selfTrustAwarded: 0 },
      error: null,
    });
    await expect(recordPersonalAction({ text: "x" })).rejects.toThrow(
      "verified",
    );
  });
  it("allows a saved practice with no XP when allowance is exhausted", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        id: "saved",
        xpAwarded: 0,
        selfTrustAwarded: 0,
        alreadyCompleted: false,
      },
      error: null,
    });
    expect((await recordPersonalAction({ text: "practice" })).xpAwarded).toBe(
      0,
    );
  });
  it("uses only the session ID/reflection for reset closeout, with no day or XP input", async () => {
    await completeLegacyResetDay("session", "private reflection");
    expect(mocks.rpc).toHaveBeenCalledWith("complete_legacy_reset_day", {
      p_session_id: "session",
      p_reflection: "private reflection",
    });
  });
  it("validates event identity and asks the server to calculate wellness milestones", async () => {
    await awardLegacyPersonalEvent("quest_complete", "owned-record");
    expect(mocks.rpc).toHaveBeenCalledWith("award_legacy_personal_event", {
      p_source: "quest_complete",
      p_record_id: "owned-record",
    });
    await awardWellnessMilestone();
    expect(mocks.rpc).toHaveBeenCalledWith("award_wellness_milestone", {});
  });
  it("does not infer a successful reward from a failed server request", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    await expect(recordPersonalAction({ text: "x" })).rejects.toThrow("denied");
  });
  it("normalizes advertised mission rewards from the server policy, not supplied fields", () => {
    expect(
      buildMissionOfTheDay({ xpReward: 999999, selfTrustReward: 999999 }),
    ).toMatchObject({ xpReward: 40, selfTrustReward: 10 });
  });
});
describe("no direct client ledger writes", () => {
  it("routes every client reward/closeout write through the authenticated server", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(dir + "/" + e.name)
          : /\.tsx?$/.test(e.name)
            ? [dir + "/" + e.name]
            : [],
      );
    for (const file of walk("src")) {
      const src = readFileSync(file, "utf8");
      if (!/xp_logs|completed_actions|daily_resets/.test(src)) continue;
      const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
      const inspect = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ["insert", "upsert", "update"].includes(node.expression.name.text)
        )
          expect(node.expression.expression.getText(ast), file).not.toMatch(
            /\.from\(\s*["'](?:xp_logs|completed_actions|daily_resets)["']\s*\)/,
          );
        ts.forEachChild(node, inspect);
      };
      inspect(ast);
    }
  });
});

it("zero rewards stay practice records rather than fabricated XP", () => {
  expect(
    getChargeMomentDisplay({
      type: "awareness",
      xpAwarded: 0,
      progress: 0,
      totalXp: 0,
    }).rewardLabel,
  ).toBe("Practice recorded");
});
it("a covenant uses its frozen timezone when the user travels", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T00:30:00Z"));
  expect(getTodayDateKey("America/Los_Angeles")).toBe("2026-10-20");
  expect(getTodayDateKey("Asia/Tokyo")).toBe("2026-10-21");
  vi.useRealTimers();
});

it("reset calendar days stay correct across DST and travel", () => {
  expect(
    getResetDayNumber(
      "2026-03-07",
      "America/Los_Angeles",
      new Date("2026-03-09T07:30:00Z"),
    ),
  ).toBe(3);
  expect(
    getResetDayNumber(
      "2026-10-20",
      "America/Los_Angeles",
      new Date("2026-10-21T00:30:00Z"),
    ),
  ).toBe(1);
  expect(
    getResetDayNumber(
      "2026-10-20",
      "Asia/Tokyo",
      new Date("2026-10-21T00:30:00Z"),
    ),
  ).toBe(2);
});

it("circle attendance sends only the circle and saved-session IDs", async()=>{
 await recordCircleAttendance("circle","session");
 expect(mocks.rpc).toHaveBeenCalledWith("record_circle_attendance",{p_challenge_id:"circle",p_reset_session_id:"session"});
});
