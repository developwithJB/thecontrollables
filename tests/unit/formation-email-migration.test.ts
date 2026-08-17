import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/migrations/20260816090000_formation_email_enrollment.sql", "utf8");

describe("formation email enrollment migration", () => {
  it("persists a validated path and explicit email enrollment from signup metadata", () => {
    expect(source).toContain("formation_track text");
    expect(source).toContain("formation_email_enabled");
    expect(source).toContain("formation_email_opt_in_at");
    expect(source).toContain("formation_track IN ('read_along', 'charge_40', 'fully_charged_75')");
  });

  it("keeps authenticated enrollment owner-scoped", () => {
    expect(source).toContain("current_user_id uuid := auth.uid()");
    expect(source).toContain("REVOKE ALL ON FUNCTION public.activate_formation_path(text, boolean, text) FROM PUBLIC, anon");
    expect(source).toContain("GRANT EXECUTE ON FUNCTION public.activate_formation_path(text, boolean, text) TO authenticated");
  });
});
