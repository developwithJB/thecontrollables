import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  "supabase/migrations/20261007000100_server_book_loop.sql",
  "utf8",
);

describe("book-loop database boundaries", () => {
  for (const [table, prefix] of [
    ["controllables_book_records", "book_records"],
    ["controllables_book_imports", "book_imports"],
  ]) {
    it(`${table} has authenticated owner-only CRUD policies`, () => {
      expect(sql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(
        `CREATE POLICY ${prefix}_select ON public.${table} FOR SELECT TO authenticated USING (auth.uid() = user_id)`,
      );
      expect(sql).toContain(
        `CREATE POLICY ${prefix}_insert ON public.${table} FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`,
      );
      expect(sql).toContain(
        `CREATE POLICY ${prefix}_update ON public.${table} FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
      );
      expect(sql).toContain(
        `CREATE POLICY ${prefix}_delete ON public.${table} FOR DELETE TO authenticated USING (auth.uid() = user_id)`,
      );
    });
  }
  it("revokes broad access and grants only editable payload columns", () => {
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain(
      "GRANT UPDATE (payload) ON TABLE public.controllables_book_records TO authenticated",
    );
    expect(sql).not.toMatch(
      /GRANT UPDATE \([^)]*(user_id|revision|created_at|updated_at)/,
    );
    expect(sql).not.toMatch(/GRANT .* TO anon/);
  });
  it("uses caller RLS, binds the expected account, and never escalates", () => {
    expect(sql.match(/SECURITY INVOKER/g)).toHaveLength(2);
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql.match(/auth.uid\(\) IS DISTINCT FROM p_user_id/g)).toHaveLength(
      2,
    );
    expect(sql).toContain("REVOKE ALL ON FUNCTION");
  });
  it("makes import retryable without updating existing server data", () => {
    const body = sql.split("CREATE FUNCTION public.import_book_loop")[1];
    expect(body).toContain(
      "IF EXISTS (SELECT 1 FROM public.controllables_book_imports",
    );
    expect(body).toContain(
      "ON CONFLICT (user_id, kind, record_key) DO NOTHING",
    );
    expect(body).not.toContain("DO UPDATE");
    expect(
      body.indexOf("INSERT INTO public.controllables_book_records"),
    ).toBeLessThan(
      body.indexOf("INSERT INTO public.controllables_book_imports"),
    );
  });
  it("checks revisions atomically and never reuses revisions after deletion", () => {
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("RAISE EXCEPTION 'book_loop_conflict'");
    expect(sql).toContain("nextval('public.book_record_revision_seq')");
  });
  it("does not modify protected formation or proof infrastructure", () => {
    expect(sql).not.toMatch(
      /(?:ALTER|UPDATE|DROP)\s+(?:TABLE\s+)?(?:public\.)?(?:formation_|fully_charged_|storage\.)/i,
    );
    expect(sql).not.toContain("reviewed_75_day_content_bundle_not_ready");
  });
});
