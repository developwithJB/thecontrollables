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
});
