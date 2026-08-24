import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const insights = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-insights/index.ts"),
  "utf8",
);
const snapshotInsights = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-snapshot-insight/index.ts"),
  "utf8",
);
const functionConfig = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");
const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824143000_secure_insights_entitlements_and_ig_proof.sql",
  ),
  "utf8",
);
const profilePrivileges = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260824150000_lock_profile_write_columns.sql"),
  "utf8",
);
const igProof = readFileSync(resolve(process.cwd(), "src/hooks/useIGProof.ts"), "utf8");

describe("critical production security boundaries", () => {
  it("binds behavioral insights to a validated authenticated caller", () => {
    expect(insights).toContain('JSON.stringify({ error: "Authentication required" })');
    expect(insights).toContain("await authClient.auth.getUser()");
    expect(insights).toContain("const userId = authData.user.id");
    expect(insights).not.toContain("body.userId");

    const authCheck = insights.indexOf("await authClient.auth.getUser()");
    const serviceClient = insights.indexOf("createClient(supabaseUrl, supabaseServiceKey)");
    const behavioralQuery = insights.indexOf('.from("daily_checkins")');
    expect(authCheck).toBeGreaterThan(-1);
    expect(authCheck).toBeLessThan(serviceClient);
    expect(authCheck).toBeLessThan(behavioralQuery);
    expect(functionConfig).toMatch(/\[functions\.generate-insights\]\s+verify_jwt = true/);
  });

  it("binds snapshot analytics and the requested session to the caller", () => {
    expect(snapshotInsights).toContain("await authClient.auth.getUser()");
    expect(snapshotInsights).toContain("const userId = authData.user.id");
    expect(snapshotInsights).not.toContain("const { userId,");
    expect(snapshotInsights).toContain('.eq("user_id", userId)');

    const authCheck = snapshotInsights.indexOf("await authClient.auth.getUser()");
    const serviceClient = snapshotInsights.indexOf("createClient(supabaseUrl, supabaseServiceKey)");
    expect(authCheck).toBeGreaterThan(-1);
    expect(authCheck).toBeLessThan(serviceClient);
    expect(functionConfig).toMatch(/\[functions\.generate-snapshot-insight\]\s+verify_jwt = true/);
  });

  it("keeps profile plan tiers server-managed while retaining owner checks", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.protect_profile_plan_tier()");
    expect(migration).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(migration).toContain("NEW.plan_tier IS DISTINCT FROM OLD.plan_tier");
    expect(migration).toContain("WITH CHECK (auth.uid() = id AND plan_tier = 'free')");
    expect(migration).toContain("WITH CHECK (auth.uid() = id)");
    expect(profilePrivileges).toContain(
      "REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon, authenticated",
    );
    expect(profilePrivileges).toContain("ON TABLE public.profiles TO authenticated");
    const allowedUpdateColumns = profilePrivileges.match(
      /GRANT UPDATE \(([\s\S]*?)\) ON TABLE public\.profiles/,
    )?.[1];
    expect(allowedUpdateColumns).toBeTruthy();
    expect(allowedUpdateColumns).not.toContain("plan_tier");
    expect(profilePrivileges).toContain(
      'DROP POLICY IF EXISTS "Users can insert their own profile"',
    );
  });

  it("enables JWT verification at the gateway for every release-critical function", () => {
    expect(functionConfig).toMatch(/\[functions\.send-daily-nudge\]\s+verify_jwt = true/);
    expect(functionConfig).toMatch(/\[functions\.generate-insights\]\s+verify_jwt = true/);
    expect(functionConfig).toMatch(/\[functions\.generate-snapshot-insight\]\s+verify_jwt = true/);
  });

  it("makes IG proof images private and resolves only owner-scoped signed URLs", () => {
    expect(migration).toContain("SET public = false");
    expect(migration).toContain('DROP POLICY IF EXISTS "Public can view ig proof images"');
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(igProof).toContain(".createSignedUrl(storagePath, 10 * 60)");
    expect(igProof).toContain("getOwnedIGProofStoragePath");
    expect(igProof).not.toContain("getPublicUrl");
  });
});
