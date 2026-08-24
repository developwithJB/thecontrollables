import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const insights = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-insights/index.ts"),
  "utf8",
);
const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260824143000_secure_insights_entitlements_and_ig_proof.sql",
  ),
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
  });

  it("keeps profile plan tiers server-managed while retaining owner checks", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.protect_profile_plan_tier()");
    expect(migration).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(migration).toContain("NEW.plan_tier IS DISTINCT FROM OLD.plan_tier");
    expect(migration).toContain("WITH CHECK (auth.uid() = id AND plan_tier = 'free')");
    expect(migration).toContain("WITH CHECK (auth.uid() = id)");
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
