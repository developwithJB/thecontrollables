import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260824110000_secure_challenge_invites.sql"),
  "utf8",
);

const circleHook = readFileSync(resolve(process.cwd(), "src/hooks/useCircle.ts"), "utf8");

describe("challenge invite security contract", () => {
  it("removes broad invite-code visibility and exposes authenticated exact-code RPCs", () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Authenticated users can view challenges by invite code"',
    );
    expect(migration).toContain("WHERE c.invite_code = normalized_code");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain("FROM PUBLIC, anon");
  });

  it("makes joining atomic and enforces authentication, capacity, and membership", () => {
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("current_member_count >= selected_challenge.max_members");
    expect(migration).toContain("cp.user_id = current_user_id");
    expect(migration).toContain('DROP POLICY IF EXISTS "Users can join challenges"');
    expect(migration).toContain('CREATE POLICY "Circle creators can add themselves"');
  });

  it("uses the RPC boundary instead of direct invite-code table reads", () => {
    expect(circleHook).toContain('supabase.rpc("lookup_challenge_by_invite_code"');
    expect(circleHook).toContain('supabase.rpc("join_challenge_by_invite_code"');
    expect(circleHook).not.toMatch(
      /\.from\("challenges"\)[\s\S]{0,240}\.eq\("invite_code"/,
    );
  });
});
