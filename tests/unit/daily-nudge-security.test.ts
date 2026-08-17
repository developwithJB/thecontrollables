import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/functions/send-daily-nudge/index.ts", "utf8");

describe("daily nudge privileged test path", () => {
  it("requires admin authorization for test and targeted sends", () => {
    expect(source).toContain("const privilegedRequest =");
    expect(source).toContain('JSON.stringify({ error: "Admin authorization required" })');
    expect(source).toContain('authHeader === `Bearer ${supabaseServiceKey}`');
    expect(source).toContain('.eq("role", "admin")');
  });

  it("only permits forced dedupe bypass for a named user", () => {
    expect(source).toContain('JSON.stringify({ error: "forceSend requires targetUserId" })');
    expect(source).toContain('profilesQuery = profilesQuery.eq("id", requestBody.targetUserId)');
    expect(source).toContain('.upsert(claim, { onConflict: "user_id,nudge_date" })');
  });

  it("only bypasses the morning-hour gate for an authorized targeted force send", () => {
    expect(source).toContain("const forceTargetedSend =");
    expect(source).toContain(
      "requestBody.forceSend === true && Boolean(requestBody.targetUserId)",
    );
    expect(source).toContain("if (testMode || forceTargetedSend)");
  });

  it("adds a privacy-safe prior-day timeline recap to normal daily paths", () => {
    expect(source).toContain("getTimelineEmailRecap");
    expect(source).toContain("appendTimelineEmailRecap");
    expect(source).toContain("DASHBOARD_TIMELINE_URL");
    expect(source).toContain('shiftLocalDate(localDate, -1)');
  });

  it("uses a selected formation path as the primary morning email", () => {
    expect(source).toContain("getFormationEmailContext");
    expect(source).toContain("buildFormationDailyEmailPayload");
    expect(source.indexOf("if (formationContext)")).toBeLessThan(
      source.indexOf("const datedGoalEmail = await getActiveDatedGoalEmail"),
    );
    expect(source).toContain('.select("circuit_type, completion_state")');
    expect(source).toContain("const formationContext = await getFormationEmailContext");
    expect(source).toContain("FORMATION_TODAY_URL");
  });
});
