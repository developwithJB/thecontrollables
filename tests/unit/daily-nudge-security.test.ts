import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/functions/send-daily-nudge/index.ts", "utf8");

describe("daily nudge invocation security", () => {
  it("requires service-role or admin authorization for every send path", () => {
    expect(source).not.toContain("const privilegedRequest =");
    expect(source).toContain('JSON.stringify({ error: "Authentication required" })');
    expect(source).toContain('JSON.stringify({ error: "Admin authorization required" })');
    expect(source).toContain('authHeader === `Bearer ${supabaseServiceKey}`');
    expect(source).toContain('.eq("role", "admin")');
  });

  it("authorizes before audience lookup or email service setup", () => {
    const authCheck = source.indexOf('const authHeader = req.headers.get("Authorization")');
    const resendSetup = source.indexOf('const resend = new Resend(resendApiKey)');
    const audienceLookup = source.indexOf('let profilesQuery = supabase');

    expect(authCheck).toBeGreaterThan(-1);
    expect(authCheck).toBeLessThan(resendSetup);
    expect(authCheck).toBeLessThan(audienceLookup);
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
});
