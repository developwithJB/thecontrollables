// Disposable local QA database only. No production connection or notification.
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const name = "push_circle_qa_" + randomUUID().replaceAll("-", ""),
  owner = randomUUID(),
  other = randomUUID(),
  journey = randomUUID(),
  circle = randomUUID(),
  session = randomUUID();
const admin = postgres(
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  { max: 1 },
);
let sql,
  created = false,
  passed = 0;
const check = async (name, fn) => {
  await fn();
  passed++;
  console.log("PASS " + name);
};
const asRole = (role, actor, fn) =>
  sql.begin(async (tx) => {
    await tx.unsafe("SET LOCAL ROLE " + role);
    await tx`SELECT set_config('request.jwt.claim.sub',${actor || ""},true)`;
    return fn(tx);
  });
const user = (fn) => asRole("authenticated", owner, fn),
  service = (fn) => asRole("service_role", null, fn);
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  sql = postgres("postgresql://postgres:postgres@127.0.0.1:55322/" + name, {
    max: 10,
  });
  await sql.unsafe(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY,timezone text,push_nudges_enabled boolean);
 CREATE TABLE challenges(id uuid PRIMARY KEY,is_solo boolean,journey_id uuid);
 CREATE TABLE challenge_participants(challenge_id uuid,user_id uuid,covenant_accepted boolean);
 CREATE TABLE reset_sessions(id uuid PRIMARY KEY,user_id uuid,journey_id uuid,covenant_accepted boolean,timezone text,start_date date);
 CREATE TABLE daily_resets(id uuid PRIMARY KEY,session_id uuid,user_id uuid,day_number int,completed_at timestamptz);
 CREATE TABLE challenge_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),challenge_id uuid,user_id uuid,day_number int,completed boolean,completed_at timestamptz,log_date date,UNIQUE(challenge_id,user_id,day_number));
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
 ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;CREATE POLICY owner_select ON challenge_progress FOR SELECT TO authenticated USING(user_id=auth.uid());CREATE POLICY owner_insert ON challenge_progress FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());`);
  await sql`INSERT INTO auth.users VALUES(${owner}),(${other})`;
  await sql`INSERT INTO profiles VALUES(${owner},'UTC',true),(${other},'UTC',false)`;
  await sql`INSERT INTO challenges VALUES(${circle},false,${journey})`;
  await sql`INSERT INTO challenge_participants VALUES(${circle},${owner},true)`;
  await sql`INSERT INTO reset_sessions VALUES(${session},${owner},${journey},true,'UTC',(now() AT TIME ZONE 'UTC')::date)`;
  const migration = readFileSync(
    "supabase/migrations/20261021000500_push_and_circle_boundaries.sql",
    "utf8",
  );
  await check("canonical migration applies twice", async () => {
    await sql.unsafe(migration);
    await sql.unsafe(migration);
  });
  await check(
    "clients cannot claim pushes or write circle completion",
    async () => {
      await assert.rejects(
        user((tx) => tx`SELECT claim_push_nudge(${owner},CURRENT_DATE)`),
        /permission denied/,
      );
      await assert.rejects(
        user((tx) => tx`INSERT INTO challenge_progress DEFAULT VALUES`),
        /permission denied/,
      );
      await assert.rejects(
        asRole(
          "anon",
          null,
          (tx) => tx`SELECT record_circle_attendance(${circle},${session})`,
        ),
        /permission denied/,
      );
    },
  );
  await check(
    "push claims require opt-in, real local date and valid timezone",
    async () => {
      assert.equal(
        (
          await service(
            (tx) =>
              tx`SELECT claim_push_nudge(${other},(now() AT TIME ZONE 'UTC')::date) AS ok`,
          )
        )[0].ok,
        false,
      );
      assert.equal(
        (
          await service(
            (tx) =>
              tx`SELECT claim_push_nudge(${owner},(now() AT TIME ZONE 'UTC')::date+1) AS ok`,
          )
        )[0].ok,
        false,
      );
      await sql`UPDATE profiles SET timezone='invalid/zone' WHERE id=${owner}`;
      assert.equal(
        (
          await service(
            (tx) => tx`SELECT claim_push_nudge(${owner},CURRENT_DATE) AS ok`,
          )
        )[0].ok,
        false,
      );
      await sql`UPDATE profiles SET timezone='UTC' WHERE id=${owner}`;
    },
  );
  await check(
    "concurrent push runners obtain one account/date claim",
    async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          service(
            (tx) =>
              tx`SELECT claim_push_nudge(${owner},(now() AT TIME ZONE 'UTC')::date) AS ok`,
          ),
        ),
      );
      assert.equal(results.filter((r) => r[0].ok).length, 1);
    },
  );
  await check(
    "circle attendance requires membership and owned matching reset",
    async () => {
      await assert.rejects(
        asRole(
          "authenticated",
          other,
          (tx) => tx`SELECT record_circle_attendance(${circle},${session})`,
        ),
        /circle_membership_required/,
      );
      const otherSession = randomUUID();
      await sql`INSERT INTO reset_sessions VALUES(${otherSession},${other},${journey},true,'UTC',CURRENT_DATE)`;
      await assert.rejects(
        user(
          (tx) =>
            tx`SELECT record_circle_attendance(${circle},${otherSession})`,
        ),
        /owned_matching_reset_required/,
      );
      await sql`UPDATE reset_sessions SET journey_id=${randomUUID()} WHERE id=${session}`;
      await assert.rejects(
        user((tx) => tx`SELECT record_circle_attendance(${circle},${session})`),
        /owned_matching_reset_required/,
      );
      await sql`UPDATE reset_sessions SET journey_id=${journey} WHERE id=${session}`;
    },
  );
  await check(
    "missing or older server day never creates current attendance",
    async () => {
      assert.equal(
        (
          await user(
            (tx) =>
              tx`SELECT record_circle_attendance(${circle},${session}) AS r`,
          )
        )[0].r.recorded,
        false,
      );
      await sql`INSERT INTO daily_resets VALUES(${randomUUID()},${session},${owner},1,now()-interval '1 day')`;
      assert.equal(
        (
          await user(
            (tx) =>
              tx`SELECT record_circle_attendance(${circle},${session}) AS r`,
          )
        )[0].r.recorded,
        false,
      );
    },
  );
  await check(
    "current server-saved reset determines day, date and replay-safe attendance",
    async () => {
      await sql`UPDATE daily_resets SET completed_at=now() WHERE session_id=${session}`;
      const result = (
        await user(
          (tx) =>
            tx`SELECT record_circle_attendance(${circle},${session}) AS r`,
        )
      )[0].r;
      assert.equal(result.recorded, true);
      assert.equal(result.newRecord, true);
      const repeated = (
        await user(
          (tx) =>
            tx`SELECT record_circle_attendance(${circle},${session}) AS r`,
        )
      )[0].r;
      assert.equal(repeated.newRecord, false);
      const rows =
        await sql`SELECT user_id,day_number,log_date::text FROM challenge_progress`;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, owner);
      assert.equal(rows[0].day_number, 1);
      assert.equal(rows[0].log_date, new Date().toISOString().slice(0, 10));
    },
  );
  console.log(passed + " push/circle database checks passed");
} finally {
  if (sql) await sql.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
