import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260801110000_formation_content_operating_system.sql"), "utf8");

describe("formation content migration", () => {
  it("prevents draft leakage outside admins", () => {
    expect(migration).toContain("publication_status = 'published'");
    expect(migration).toContain("effective_date <= current_date");
    expect(migration).toContain("OR public.is_admin()");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON public.formation_content_versions FROM authenticated, anon");
  });

  it("enforces citations, classification, Scripture validation, and independent review", () => {
    expect(migration).toContain("historical_citations_required");
    expect(migration).toContain("creative_reconstruction_label_required");
    expect(migration).toContain("invalid_scripture_reference");
    expect(migration).toContain("author_user_id IS DISTINCT FROM auth.uid()");
    expect(migration).toContain("human_theological_review_required");
  });

  it("retains historical content version identifiers on formation records", () => {
    expect(migration).toContain("ADD COLUMN content_version_id uuid");
    expect(migration).toContain("content_version_id = COALESCE(formation_circuit_entries.content_version_id");
    expect(migration).toContain("CREATE TABLE public.formation_content_review_events");
  });
});

