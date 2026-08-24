import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260804120000_fully_charged_75_journey.sql"),
  "utf8",
);
const simulation = readFileSync(
  resolve(process.cwd(), "tests/database/fully-charged-75-simulation.sql"),
  "utf8",
);

describe("Fully Charged 75 database lifecycle", () => {
  it("creates owner-private attempt, setup, and canonical day authority", () => {
    expect(migration).toContain("CREATE TABLE public.formation_attempts");
    expect(migration).toContain("CREATE TABLE public.formation_strict_setups");
    expect(migration).toContain("CREATE TABLE public.formation_days");
    expect(migration).toContain("CREATE UNIQUE INDEX formation_attempts_one_live_strict_idx");
    expect(migration).toContain("ALTER TABLE public.formation_attempts ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.formation_days ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON public.formation_attempts FROM authenticated, anon");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON public.formation_days FROM authenticated, anon");
  });

  it("precreates exactly 75 fixed-timezone calendar days and three seasons", () => {
    expect(migration).toContain("FROM generate_series(0, 74) AS offset_value");
    expect(migration).toContain("(p_start_local_date + offset_value)::timestamp AT TIME ZONE p_timezone");
    expect(migration).toContain("(p_start_local_date + offset_value + 1)::timestamp AT TIME ZONE p_timezone");
    expect(migration).toContain("WHEN offset_value + 1 <= 25 THEN 'be_with_jesus'");
    expect(migration).toContain("WHEN offset_value + 1 <= 50 THEN 'become_like_jesus'");
    expect(migration).toContain("ELSE 'do_what_jesus_did'");
  });

  it("requires explicit readiness and a fully reviewed 75-day content bundle", () => {
    expect(migration).toContain("strict_readiness_incomplete");
    expect(migration).toContain("main_promise_required");
    expect(migration).toContain("invalid_iana_timezone");
    expect(migration).toContain("reviewed_75_day_content_bundle_not_ready");
    expect(migration).toContain("version.day_start = version.day_end");
    expect(migration).toContain("version.theological_review_status = 'approved'");
    expect(migration).toContain("version.reviewer_user_id IS DISTINCT FROM version.author_user_id");
    expect(migration).toContain("begin_again_must_start_after_previous_practice_date");
    expect(migration).toContain("attempt_date_range_conflicts_with_existing_strict_history");
  });

  it("derives strict circuit state on the server and pins each entry to its day", () => {
    expect(migration).toContain("required_actions := CASE p_circuit_type");
    expect(migration).toContain("normalized_state := CASE");
    expect(migration).toContain("attempt_id, formation_day_id, day_number, completed_at");
    expect(migration).toContain("formation_day_not_open");
    expect(migration).toContain("attempt_rules_version_mismatch");
    expect(migration).toContain("current_reviewed_day_content_required");
    expect(migration).toContain("invalid_or_duplicate_strict_action_id");
    expect(migration).toContain("strict_action_claim_does_not_match_payload");
    expect(migration).toContain("p_payload #> ARRAY['actions', allowed.action_id] = 'true'::jsonb");
  });

  it("makes explicit closeout and Day 75 completion atomic and idempotent", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.close_fully_charged_day");
    expect(migration).toContain("server_confirmed_closeout");
    expect(migration).toContain("IF target_day.day_number = 75 THEN");
    expect(migration).toContain("SET status = 'completed'");
    expect(migration).toContain("'controllableReps', 375");
    expect(migration).toContain("ON CONFLICT (user_id, completion_key) DO NOTHING");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.end_overdue_fully_charged_attempts");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.end_overdue_fully_charged_attempts() TO service_role");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_current_fully_charged_content");
    expect(migration).toContain("version.effective_date <= day.local_date");
  });

  it("ships a rollback-only persisted simulation for 75 complete days and an ended attempt", () => {
    expect(simulation).toContain("FOR day_value IN 1..75 LOOP");
    expect(simulation).toContain("simulation_expected_375_complete_circuits");
    expect(simulation).toContain("simulation_expected_one_atomic_completion_record");
    expect(simulation).toContain("simulation_expected_attempt_to_end_on_day_10");
    expect(simulation).toContain("simulation_expected_23_hour_spring_day");
    expect(simulation).toContain("simulation_expected_25_hour_fall_day");
    expect(simulation).toContain("simulation_expected_tampered_client_claim_rejection");
    expect(simulation.trimEnd()).toMatch(/ROLLBACK;$/);
  });
});
