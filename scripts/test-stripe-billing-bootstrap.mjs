// Exact canonical migration against the production's original schema, in a NEW
// disposable database inside the isolated local port55322 PostgreSQL cluster.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base =
  process.env.DASHBOARD_BUDGET_TEST_DB ??
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const parsed = new URL(base);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.port !== "55322" ||
  parsed.pathname !== "/postgres"
)
  throw Error("Isolated localhost:55322/postgres required");
const name = "billing_bootstrap_" + randomUUID().replaceAll("-", "");
const admin = postgres(base, { max: 1 });
let sql,
  created = false,
  passed = 0;
const check = async (label, fn) => {
  await fn();
  passed++;
  console.log("PASS " + label);
};
const owner = randomUUID(),
  other = randomUUID();
try {
  await admin.unsafe('CREATE DATABASE "' + name + '"');
  created = true;
  parsed.pathname = "/" + name;
  sql = postgres(parsed.toString(), { max: 1 });
  await sql.unsafe(`CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 GRANT USAGE ON SCHEMA public TO authenticated,service_role;`);
  await sql.unsafe(
    readFileSync(
      "supabase/migrations/20260115183855_13163110-11b5-42a8-a297-9ff0e73b0821.sql",
      "utf8",
    ),
  );
  await sql`insert into auth.users(id) values(${owner}),(${other})`;
  await sql`insert into public.user_entitlements(user_id,source,granted_by) values(${owner},'manual','synthetic legacy grant')`;
  const migration = readFileSync(
    "supabase/migrations/20261020000450_stripe_billing_projection.sql",
    "utf8",
  );
  await check(
    "canonical compatibility migration applies to the original nine-column table",
    async () => {
      await sql.unsafe(migration);
      const columns =
        await sql`select column_name from information_schema.columns where table_schema='public' and table_name='user_entitlements'`;
      for (const field of [
        "plan_tier",
        "subscription_status",
        "price_id",
        "stripe_customer_id",
        "stripe_subscription_id",
        "current_period_start",
        "current_period_end",
        "cancel_at_period_end",
        "updated_at",
      ])
        assert(columns.some((c) => c.column_name === field));
    },
  );
  await check(
    "legacy grants remain intact without inventing a tier or payment status",
    async () => {
      const [row] =
        await sql`select * from public.user_entitlements where user_id=${owner}`;
      assert.equal(row.source, "manual");
      assert.equal(row.granted_by, "synthetic legacy grant");
      assert.equal(row.plan_tier, null);
      assert.equal(row.subscription_status, null);
    },
  );
  await check(
    "verified service billing sync can persist the complete Stripe projection",
    async () => {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;
        await tx`insert into public.user_entitlements(user_id,source,plan_tier,subscription_status,stripe_customer_id,stripe_subscription_id,price_id,current_period_start,current_period_end) values(${other},'stripe_subscription','pro','active','cus_synthetic','sub_synthetic','price_synthetic',now(),now()+interval '1 month')`;
      });
      const [row] =
        await sql`select plan_tier from public.user_entitlements where user_id=${other}`;
      assert.equal(row.plan_tier, "pro");
    },
  );
  await check(
    "authenticated callers cannot forge, edit or delete a paid entitlement",
    async () => {
      for (const statement of [
        "insert into public.user_entitlements(user_id,source,plan_tier) values('" +
          randomUUID() +
          "','manual','pro')",
        "update public.user_entitlements set plan_tier='pro'",
        "delete from public.user_entitlements",
      ]) {
        await assert.rejects(
          sql.begin(async (tx) => {
            await tx`set local role authenticated`;
            await tx.unsafe(statement);
          }),
          (e) => e.code === "42501",
        );
      }
    },
  );
  await check(
    "existing owner read policy isolates each account after adding billing fields",
    async () => {
      await sql.begin(async (tx) => {
        await tx`select set_config('request.jwt.claim.sub',${owner},true)`;
        await tx`set local role authenticated`;
        const rows = await tx`select user_id from public.user_entitlements`;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].user_id, owner);
      });
    },
  );
  await check(
    "webhook receipts remain service-only and retain duplicate-delivery protection",
    async () => {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;
        await tx`insert into public.stripe_webhook_events(id,type) values('evt_synthetic','checkout.session.completed')`;
      });
      await assert.rejects(
        sql`insert into public.stripe_webhook_events(id,type) values('evt_synthetic','checkout.session.completed')`,
        (e) => e.code === "23505",
      );
      await assert.rejects(
        sql.begin(async (tx) => {
          await tx`set local role authenticated`;
          await tx`select * from public.stripe_webhook_events`;
        }),
        (e) => e.code === "42501",
      );
    },
  );
  await check(
    "reapplying the additive migration preserves rows and remains safe",
    async () => {
      await sql.unsafe(migration);
      assert.equal(
        Number(
          (await sql`select count(*) from public.user_entitlements`)[0].count,
        ),
        2,
      );
    },
  );
  console.log(passed + " bootstrap checks passed");
} finally {
  await sql?.end();
  if (created) await admin.unsafe('DROP DATABASE "' + name + '"');
  await admin.end();
}
