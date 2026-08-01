import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260801090000_formation_daily_circuits.sql"),
  "utf8",
);

describe("formation migration security contract", () => {
  it("creates a non-public proof bucket with owner-folder policies", () => {
    expect(migration).toContain("'formation-proof'");
    expect(migration).toMatch(/'formation-proof',\s*'formation-proof',\s*false/);
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(migration).not.toContain("getPublicUrl");
  });

  it("enables RLS and prevents ordinary direct circuit writes", () => {
    expect(migration).toContain("ALTER TABLE public.formation_circuit_entries ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON public.formation_circuit_entries FROM authenticated, anon");
    expect(migration).toContain("IF current_user_id IS NULL");
  });

  it("enforces one idempotent daily record per track and circuit", () => {
    expect(migration).toContain("UNIQUE (user_id, local_date, track, circuit_type)");
    expect(migration).toContain("UNIQUE (user_id, idempotency_key)");
    expect(migration).toContain("ON CONFLICT (user_id, local_date, track, circuit_type)");
  });
});
