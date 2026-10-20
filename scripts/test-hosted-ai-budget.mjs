// Local PostgreSQL only. Applies canonical prerequisite DDL once, then runs the
// real security-definer functions concurrently. Never connects to a remote DB.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const url =
  process.env.DASHBOARD_BUDGET_TEST_DB ??
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const parsed = new URL(url);
if (
  !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
  parsed.port !== "55322"
)
  throw Error("Local isolated stack on port 55322 required");
const sql = postgres(url, { max: 32 });
let passed = 0;
const owners = [];
async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
const reserve = (owner, feature, cost, chat = null) =>
  sql.begin(async (tx) => {
    await tx`set local role service_role`;
    return (
      await tx`select public.reserve_hosted_ai(${owner}::uuid,${feature},${cost},${chat}::uuid) as result`
    )[0].result;
  });
async function owner(tier = "free", verified = true) {
  const id = randomUUID();
  owners.push(id);
  await sql`insert into auth.users(id,email,email_confirmed_at) values(${id},${id + "@budget-test.invalid"},${verified ? new Date() : null})`;
  await sql`insert into public.profiles(id,plan_tier) values(${id},${tier}) on conflict(id) do update set plan_tier=excluded.plan_tier`;
  if (tier !== "free")
    await sql`insert into public.user_entitlements(user_id,source,plan_tier,subscription_status,expires_at) values(${id},'stripe_subscription',${tier},'active',now()+interval '1 year')`;
  return id;
}
try {
  if (process.env.DASHBOARD_BUDGET_RECREATE === "1") {
    await sql.unsafe(`DROP FUNCTION IF EXISTS public.disable_hosted_ai_after_mismatch();
      DROP FUNCTION IF EXISTS public.get_hosted_ai_allowance();
      DROP FUNCTION IF EXISTS public.reserve_hosted_ai(uuid,text,integer,uuid);
      DROP FUNCTION IF EXISTS public.hosted_ai_daily_limit(uuid);
      DROP FUNCTION IF EXISTS public.hosted_ai_plan(uuid);
      DROP TABLE IF EXISTS public.hosted_ai_reservations;
      DROP TABLE IF EXISTS public.hosted_ai_policy;`);
  }
  if (
    !(await sql`select to_regclass('public.user_entitlements') as name`)[0].name
  ) {
    for (const file of [
      "20260115183855_13163110-11b5-42a8-a297-9ff0e73b0821.sql",
      "202602170001_add_plan_tier_to_user_entitlements.sql",
    ])
      await sql.unsafe(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await sql.unsafe(
      readFileSync(
        "supabase/migrations/20260502003000_stripe_entitlements_ai_limits.sql",
        "utf8",
      ).split(
        "CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_customer_id",
      )[0],
    );
  }
  if (
    !(await sql`select to_regclass('public.hosted_ai_policy') as name`)[0].name
  )
    await sql.unsafe(
      readFileSync(
        "supabase/migrations/20261020000500_hosted_ai_budget.sql",
        "utf8",
      ),
    );
  await sql`update public.hosted_ai_policy set enabled=true,daily_budget_micros=10000000,free_daily_budget_micros=1000000`;
  const free = await owner(),
    paid = await owner("pro"),
    unverified = await owner("free", false);
  await check("unverified accounts cannot spend", async () =>
    assert.equal(
      (await reserve(unverified, "ai-chat", 1000, randomUUID())).code,
      "verified_email_required",
    ),
  );
  await check("free sample cannot be consumed by background AI", async () =>
    assert.equal((await reserve(free, "ai-reflect", 1000)).allowed, false),
  );
  await check(
    "concurrent free requests allow exactly five lifetime chats",
    async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          reserve(free, "ai-chat", 1000, randomUUID()),
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 5);
    },
  );
  await check("sample does not reset the next day or month", async () => {
    await sql`update public.hosted_ai_reservations set created_at=now()-interval '40 days' where user_id=${free}`;
    assert.equal(
      (await reserve(free, "ai-chat", 1000, randomUUID())).allowed,
      false,
    );
  });
  await check("profile deletion cannot reset a verified owner's lifetime budget",async()=>{
    await sql.begin(async tx=>{
      await tx`select set_config('request.jwt.claim.sub',${free},true)`;
      await tx`set local role authenticated`;
      await tx`delete from public.profiles where id=${free}`;
    });
    assert.equal(Number((await sql`select count(*) as count from public.profiles where id=${free}`)[0].count),1);
    assert.equal((await reserve(free,'ai-chat',1000,randomUUID())).allowed,false);
  });
  await check(
    "in-flight paid cost reservations stop exactly at $2.50 across features",
    async () => {
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) =>
          reserve(paid, i % 2 ? "ai-meal-plan" : "generate-insights", 100000),
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 25);
      const [{ sum }] =
        await sql`select sum(cost_micros) from public.hosted_ai_reservations where user_id=${paid}`;
      assert.equal(Number(sum), 2500000);
    },
  );
  const daily = await owner("pro");
  await check(
    "concurrent paid chat requests stop at ten per UTC day",
    async () => {
      const results = await Promise.all(
        Array.from({ length: 30 }, () =>
          reserve(daily, "ai-chat", 1000, randomUUID()),
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 10);
    },
  );
  await check(
    "tool followup spends again without counting a second reply",
    async () => {
      const [{ chat_request_id: id }] =
        await sql`select chat_request_id from public.hosted_ai_reservations where user_id=${daily} limit 1`;
      assert.equal((await reserve(daily, "ai-chat", 1000, id)).allowed, true);
    },
  );
  await check(
    "legacy paid daily limits survive within the shared monthly budget",
    async () => {
      const plus = await owner("plus"),
        legacy = await owner("pro");
      await sql`update public.user_entitlements set price_id='price_1Sty37IrFORWV7K43PkIVSJx' where user_id=${legacy}`;
      for (const [id, limit] of [
        [plus, 15],
        [legacy, 25],
      ]) {
        const results = await Promise.all(
          Array.from({ length: 30 }, () =>
            reserve(id, "ai-chat", 1000, randomUUID()),
          ),
        );
        assert.equal(results.filter((r) => r.allowed).length, limit);
      }
    },
  );
  const monthly = await owner("pro");
  await check(
    "200 monthly replies remain capped even with unused money",
    async () => {
      await sql`insert into public.hosted_ai_reservations(user_id,feature,chat_request_id,cost_micros,created_at) select ${monthly}::uuid,'ai-chat',gen_random_uuid(),1,date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' from generate_series(1,200)`;
      assert.equal(
        (await reserve(monthly, "ai-chat", 1, randomUUID())).allowed,
        false,
      );
    },
  );
  await check(
    "downgrade and unpaid status cannot retain paid budget from profile",
    async () => {
      await sql`update public.user_entitlements set subscription_status='past_due' where user_id=${daily}`;
      assert.equal((await reserve(daily, "ai-reflect", 1000)).allowed, false);
    },
  );
  await check(
    "clients cannot insert ledger rows or execute service-only reservations",
    async () => {
      for (const statement of [
        "select public.reserve_hosted_ai('" +
          free +
          "','ai-chat',1,gen_random_uuid())",
        "insert into public.hosted_ai_reservations(user_id,feature,cost_micros) values('" +
          free +
          "','ai-chat',1)",
        "select public.hosted_ai_plan('" + paid + "')",
        "select public.disable_hosted_ai_after_mismatch()",
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
    "owner status reports only authenticated owner and never accepts another ID",
    async () => {
      await sql.begin(async (tx) => {
        await tx`select set_config('request.jwt.claim.sub',${free},true)`;
        await tx`set local role authenticated`;
        const [{ status }] =
          await tx`select public.get_hosted_ai_allowance() as status`;
        assert.equal(status.plan, "free");
        assert.equal(status.repliesRemaining, 0);
      });
    },
  );
  const global = await owner("pro");
  await check("global daily cap stops spend across accounts", async () => {
    await sql`update public.hosted_ai_policy set daily_budget_micros=100000`;
    assert.equal(
      (await reserve(global, "ai-reflect", 1)).code,
      "hosted_ai_project_budget_reached",
    );
    await sql`update public.hosted_ai_policy set daily_budget_micros=10000000`;
  });
  await check("server kill switch denies all hosted inference", async () => {
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      await tx`select public.disable_hosted_ai_after_mismatch()`;
    });
    assert.equal(
      (await reserve(global, "ai-reflect", 1)).code,
      "hosted_ai_unavailable",
    );
  });
  console.log(`${passed} database checks passed`);
} finally {
  if (owners.length)
    await sql`delete from auth.users where id in ${sql(owners)}`;
  await sql`update public.hosted_ai_policy set enabled=false,daily_budget_micros=10000000,free_daily_budget_micros=1000000`;
  await sql.end();
}
