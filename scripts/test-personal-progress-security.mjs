// New disposable database on the isolated local QA cluster. Never production.
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const name = "personal_qa_" + randomUUID().replaceAll("-", ""),
  owner = randomUUID(),
  other = randomUUID();
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
const asUser = (actor, fn) =>
  sql.begin(async (tx) => {
    await tx`SET LOCAL ROLE authenticated`;
    await tx`SELECT set_config('request.jwt.claim.sub',${actor},true)`;
    return fn(tx);
  });
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  created = true;
  sql = postgres("postgresql://postgres:postgres@127.0.0.1:55322/" + name, {
    max: 8,
  });
  await sql.unsafe(
    `CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY,timezone text);
 CREATE TABLE completed_actions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,action_text text NOT NULL,controllable text,xp_awarded int NOT NULL DEFAULT10,completed_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now());
 CREATE TABLE xp_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,amount int NOT NULL CHECK(amount>0),source text,description text,created_at timestamptz DEFAULT now());
 CREATE TABLE reset_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,start_date date NOT NULL DEFAULT CURRENT_DATE,current_day int DEFAULT1,status text DEFAULT 'active',timezone text DEFAULT 'UTC',covenant_accepted boolean DEFAULT true,completed_at timestamptz,created_at timestamptz DEFAULT now());
 CREATE TABLE daily_resets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid REFERENCES reset_sessions(id),user_id uuid,day_number int CHECK(day_number BETWEEN1 AND7),reflection text,completed_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),UNIQUE(session_id,day_number));
 CREATE TABLE wellness_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,log_date date,created_at timestamptz DEFAULT now());
 CREATE TABLE main_quests(id uuid PRIMARY KEY,user_id uuid,status text,completed_at timestamptz);
 CREATE TABLE integrity_logs(id uuid PRIMARY KEY,user_id uuid,kept boolean,kept_at timestamptz);
 CREATE TABLE time_logs(id uuid PRIMARY KEY,user_id uuid,log_date date);
 CREATE TABLE covenant_challenges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,title text DEFAULT 'test',started_on date DEFAULT CURRENT_DATE,ends_on date NOT NULL DEFAULT CURRENT_DATE+74,duration_days int DEFAULT75,status text DEFAULT 'active',rules jsonb DEFAULT '["jesus_first"]',completed_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE covenant_daily_checkins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),challenge_id uuid REFERENCES covenant_challenges(id),user_id uuid,checkin_date date DEFAULT CURRENT_DATE,jesus_first boolean DEFAULT false,bible_read boolean DEFAULT false,alcohol_free boolean DEFAULT false,workout_count int DEFAULT0,nutrition_kept boolean DEFAULT false,water_goal boolean DEFAULT false,service_count int DEFAULT0,day_complete boolean DEFAULT false,completed_at timestamptz,created_at timestamptz DEFAULT now(),reflection text,updated_at timestamptz DEFAULT now(),UNIQUE(challenge_id,checkin_date));
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;`
      .replace(/DEFAULT(\d)/g, "DEFAULT $1")
      .replace(/BETWEEN1 AND7/g, "BETWEEN 1 AND 7"),
  );
  await sql`INSERT INTO auth.users VALUES(${owner}),(${other})`;
  await sql`INSERT INTO profiles VALUES(${owner},'UTC'),(${other},'UTC')`;
  for (const table of [
    "completed_actions",
    "xp_logs",
    "reset_sessions",
    "daily_resets",
    "wellness_logs",
    "covenant_challenges",
    "covenant_daily_checkins",
  ]) {
    await sql.unsafe(
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;CREATE POLICY owner_select ON ${table} FOR SELECT TO authenticated USING(user_id=auth.uid());CREATE POLICY owner_insert ON ${table} FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());CREATE POLICY owner_update ON ${table} FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());`,
    );
  }
  const migration = readFileSync(
    "supabase/migrations/20261021000400_server_personal_progress.sql",
    "utf8",
  );
  await check("canonical progress migration applies twice", async () => {
    await sql.unsafe(migration);
    await sql.unsafe(migration);
  });
  await check(
    "clients cannot write their own XP/action/reset-day rewards",
    async () => {
      for (const table of ["xp_logs", "completed_actions", "daily_resets"])
        await assert.rejects(
          asUser(owner, (tx) =>
            tx.unsafe("INSERT INTO " + table + " DEFAULT VALUES"),
          ),
          /permission denied/,
        );
      await assert.rejects(
        sql.begin(async (tx) => {
          await tx`SET LOCAL ROLE anon`;
          return tx`SELECT record_personal_action('x',NULL,'personal')`;
        }),
        /permission denied/,
      );
    },
  );
  await check(
    "personal rewards are owner-derived, fixed and idempotent",
    async () => {
      const first = (
        await asUser(
          owner,
          (tx) =>
            tx`SELECT record_personal_action('one honest action','awareness','personal') AS r`,
        )
      )[0].r;
      assert.equal(first.xpAwarded, 15);
      const second = (
        await asUser(
          owner,
          (tx) =>
            tx`SELECT record_personal_action('one honest action','awareness','personal') AS r`,
        )
      )[0].r;
      assert.equal(second.xpAwarded, 0);
      assert.equal(second.alreadyCompleted, true);
      const rows = await sql`SELECT user_id,xp_awarded FROM completed_actions`;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, owner);
    },
  );
  await check("concurrent actions cannot exceed100 activity XP", async () => {
    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        asUser(
          owner,
          (tx) =>
            tx`SELECT record_personal_action(${"distinct " + i},'habit','personal')`,
        ),
      ),
    );
    assert.equal(
      Number(
        (
          await sql`SELECT sum(amount) AS n FROM xp_logs WHERE user_id=${owner}`
        )[0].n,
      ),
      100,
    );
    assert.equal(
      (
        await sql`SELECT count(*) AS n FROM completed_actions WHERE user_id=${owner}`
      )[0].n,
      "16",
    );
  });
  await check("daily mission awards40 plus10 once, planner10", async () => {
    let r = (
      await asUser(
        other,
        (tx) =>
          tx`SELECT record_personal_action('mission','perspective','mission') AS r`,
      )
    )[0].r;
    assert.equal(r.xpAwarded, 40);
    assert.equal(r.selfTrustAwarded, 10);
    r = (
      await asUser(
        other,
        (tx) =>
          tx`SELECT record_personal_action('different claimed mission','habit','mission') AS r`,
      )
    )[0].r;
    assert.equal(r.xpAwarded, 0);
    assert.equal(
      (
        await asUser(
          other,
          (tx) =>
            tx`SELECT record_personal_action('planner task',NULL,'planner') AS r`,
        )
      )[0].r.xpAwarded,
      10,
    );
  });
  const session = randomUUID(),
    foreignSession = randomUUID();
  await sql`INSERT INTO reset_sessions(id,user_id,start_date) VALUES(${session},${owner},CURRENT_DATE),(${foreignSession},${other},CURRENT_DATE)`;
  await check(
    "reset day uses its server date and cannot be replayed or cross-account",
    async () => {
      const r = (
        await asUser(
          owner,
          (tx) =>
            tx`SELECT complete_legacy_reset_day(${session},'private reflection') AS r`,
        )
      )[0].r;
      assert.equal(r.day_number, 1);
      await asUser(
        owner,
        (tx) => tx`SELECT complete_legacy_reset_day(${session},'repeat')`,
      );
      assert.equal(
        Number(
          (
            await sql`SELECT sum(amount) AS n FROM xp_logs WHERE user_id=${owner} AND source='reset_day_complete'`
          )[0].n,
        ),
        25,
      );
      await assert.rejects(
        asUser(
          owner,
          (tx) => tx`SELECT complete_legacy_reset_day(${foreignSession},NULL)`,
        ),
        /reset_not_found/,
      );
      await assert.rejects(
        asUser(
          owner,
          (tx) =>
            tx`UPDATE reset_sessions SET status='completed',current_day=7 WHERE id=${session}`,
        ),
        /server_reset_progress_required/,
      );
    },
  );
  await check(
    "restarting a reset cannot farm a second same-day bonus",
    async () => {
      const next = randomUUID();
      await sql`INSERT INTO reset_sessions(id,user_id,start_date) VALUES(${next},${owner},CURRENT_DATE)`;
      await asUser(
        owner,
        (tx) => tx`SELECT complete_legacy_reset_day(${next},NULL)`,
      );
      assert.equal(
        Number(
          (
            await sql`SELECT sum(amount) AS n FROM xp_logs WHERE user_id=${owner} AND source='reset_day_complete'`
          )[0].n,
        ),
        25,
      );
    },
  );
  await check(
    "seven distinct dated reset days are required for server completion",
    async () => {
      const last = randomUUID();
      await sql`INSERT INTO reset_sessions(id,user_id,start_date) VALUES(${last},${other},CURRENT_DATE-6)`;
      await sql`INSERT INTO daily_resets(session_id,user_id,day_number,created_at,completed_at) SELECT ${last},${other},n,now()-(7-n)*interval '1 day',now()-(7-n)*interval '1 day' FROM generate_series(1,6)n`;
      assert.equal(
        (
          await asUser(
            other,
            (tx) => tx`SELECT complete_legacy_reset_day(${last},NULL) AS r`,
          )
        )[0].r.day_number,
        7,
      );
      assert.equal(
        (await sql`SELECT status FROM reset_sessions WHERE id=${last}`)[0]
          .status,
        "completed",
      );
    },
  );
  await check(
    "wellness milestone validates real recorded dates and does not replay",
    async () => {
      await sql`INSERT INTO wellness_logs(user_id,log_date,created_at) SELECT ${owner},CURRENT_DATE-n,now()-n*interval '1 day' FROM generate_series(0,2)n`;
      assert.equal(
        (
          await asUser(
            owner,
            (tx) => tx`SELECT award_wellness_milestone() AS r`,
          )
        )[0].r.amount,
        25,
      );
      assert.equal(
        (
          await asUser(
            owner,
            (tx) => tx`SELECT award_wellness_milestone() AS r`,
          )
        )[0].r.amount,
        0,
      );
      await asUser(
        other,
        (tx) =>
          tx`INSERT INTO wellness_logs(user_id,log_date,created_at) VALUES(${other},CURRENT_DATE-10,now()-interval '10 days')`,
      );
      assert.equal(
        (
          await asUser(
            other,
            (tx) => tx`SELECT award_wellness_milestone() AS r`,
          )
        )[0].r.amount,
        0,
      );
    },
  );
  await check(
    "legacy events require an owned record, are capped and cannot replay",
    async () => {
      const quest = randomUUID(),
        wrong = randomUUID();
      await sql`INSERT INTO main_quests VALUES(${quest},${other},'completed',now()),(${wrong},${owner},'completed',now())`;
      await assert.rejects(
        asUser(
          other,
          (tx) =>
            tx`SELECT award_legacy_personal_event('quest_complete',${wrong})`,
        ),
        /owned_completed_record_required/,
      );
      assert.equal(
        (
          await asUser(
            other,
            (tx) =>
              tx`SELECT award_legacy_personal_event('quest_complete',${quest}) AS r`,
          )
        )[0].r.amount,
        40,
      );
      assert.equal(
        (
          await asUser(
            other,
            (tx) =>
              tx`SELECT award_legacy_personal_event('quest_complete',${quest}) AS r`,
          )
        )[0].r.amount,
        0,
      );
    },
  );
  const covenant = randomUUID();
  await check(
    "a new covenant cannot pre-complete, shorten or backdate its75 days",
    async () => {
      await asUser(
        owner,
        (tx) =>
          tx`INSERT INTO covenant_challenges(id,user_id,timezone,status,duration_days) VALUES(${covenant},${owner},'UTC','completed',1)`,
      );
      const r = (
        await sql`SELECT status,duration_days FROM covenant_challenges WHERE id=${covenant}`
      )[0];
      assert.equal(r.status, "active");
      assert.equal(r.duration_days, 75);
      await assert.rejects(
        asUser(
          owner,
          (tx) =>
            tx`UPDATE covenant_challenges SET status='completed' WHERE id=${covenant}`,
        ),
        /seventy_five_recorded_days_required/,
      );
      await assert.rejects(
        asUser(
          owner,
          (tx) =>
            tx`UPDATE covenant_challenges SET started_on=CURRENT_DATE-74 WHERE id=${covenant}`,
        ),
        /attempt_dates_are_locked/,
      );
    },
  );
  await check(
    "covenant check-ins derive completion from rules and reject future/backfilled days",
    async () => {
      await asUser(
        owner,
        (tx) =>
          tx`INSERT INTO covenant_daily_checkins(challenge_id,user_id,jesus_first,day_complete) VALUES(${covenant},${owner},false,true)`,
      );
      assert.equal(
        (
          await sql`SELECT day_complete FROM covenant_daily_checkins WHERE challenge_id=${covenant}`
        )[0].day_complete,
        false,
      );
      await asUser(
        owner,
        (tx) =>
          tx`UPDATE covenant_daily_checkins SET jesus_first=true WHERE challenge_id=${covenant}`,
      );
      assert.equal(
        (
          await sql`SELECT day_complete FROM covenant_daily_checkins WHERE challenge_id=${covenant}`
        )[0].day_complete,
        true,
      );
      for (const offset of [-1, 1])
        await assert.rejects(
          asUser(
            owner,
            (tx) =>
              tx`INSERT INTO covenant_daily_checkins(challenge_id,user_id,checkin_date) VALUES(${covenant},${owner},CURRENT_DATE+${offset}::integer)`,
          ),
          /current_covenant_day_required/,
        );
    },
  );
  await check(
    "a valid75-day history closes and an honest correction invalidates completion",
    async () => {
      const c = randomUUID();
      await sql`INSERT INTO covenant_challenges(id,user_id,timezone,started_on,ends_on) VALUES(${c},${other},'UTC',CURRENT_DATE-74,CURRENT_DATE)`;
      await sql`INSERT INTO covenant_daily_checkins(challenge_id,user_id,checkin_date,jesus_first,day_complete,completed_at) SELECT ${c},${other},CURRENT_DATE-n,true,true,now()-n*interval '1 day' FROM generate_series(0,74)n`;
      await asUser(
        other,
        (tx) =>
          tx`UPDATE covenant_challenges SET status='completed' WHERE id=${c}`,
      );
      assert.equal(
        (await sql`SELECT status FROM covenant_challenges WHERE id=${c}`)[0]
          .status,
        "completed",
      );
      await asUser(
        other,
        (tx) =>
          tx`UPDATE covenant_daily_checkins SET jesus_first=false WHERE challenge_id=${c} AND checkin_date=CURRENT_DATE`,
      );
      assert.equal(
        (await sql`SELECT status FROM covenant_challenges WHERE id=${c}`)[0]
          .status,
        "ended",
      );
    },
  );
  console.log(`${passed} personal progress database checks passed`);
} finally {
  await sql?.end();
  if (created) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
