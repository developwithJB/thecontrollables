import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260804090000_covenant_challenge_and_evidence.sql"),
  "utf8",
);

const grantsMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260804221500_covenant_table_grants.sql"),
  "utf8",
);

describe("covenant migration security contract", () => {
  it("enables RLS and scopes ownership policies to the authenticated user", () => {
    expect(schemaMigration.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(3);
    expect(schemaMigration).toContain("auth.uid() = user_id");
    expect(schemaMigration).toContain("covenant_challenges_one_active_per_user");
  });

  it("grants authenticated access needed to exercise those RLS policies", () => {
    expect(grantsMigration).toContain("TO authenticated");
    expect(grantsMigration).toContain("ON TABLE public.covenant_challenges");
    expect(grantsMigration).toContain("ON TABLE public.covenant_daily_checkins");
    expect(grantsMigration).toContain("ON TABLE public.grace_evidence_entries");
  });

  it("allows the service role to compose Covenant emails", () => {
    expect(grantsMigration).toContain("GRANT ALL PRIVILEGES");
    expect(grantsMigration).toContain("TO service_role");
  });
});
