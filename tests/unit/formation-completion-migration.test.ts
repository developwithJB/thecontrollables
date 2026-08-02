import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260801100000_formation_completion_records.sql"), "utf8");

describe("formation completion migration", () => {
  it("separates immutable count records from private reflections", () => {
    expect(migration).toContain("CREATE TABLE public.formation_completion_records");
    expect(migration).toContain("CREATE TABLE public.formation_completion_reflections");
    expect(migration).toContain("formation_completion_records_are_immutable");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON public.formation_completion_records FROM authenticated, anon");
  });

  it("owner-scopes both tables and constrains reflection writes through an RPC", () => {
    expect(migration).toMatch(/auth\.uid\(\) = user_id/g);
    expect(migration).toContain("completion_record_not_owned");
    expect(migration).toContain("unsupported_reflection_field");
    expect(migration).toContain("reflection_answer_too_long");
  });

  it("does not persist a public milestone payload or share URL", () => {
    expect(migration).not.toContain("public_url");
    expect(migration).not.toContain("prayer_text");
    expect(migration).not.toContain("proof_url");
    expect(migration).not.toContain("service_recipient");
  });
});

