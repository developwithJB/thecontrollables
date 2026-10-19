// Run with a LOCAL SUPABASE_DB_URL only; no provider call or real API key.
import postgres from "npm:postgres@3.4.9";
import { loadCoachCredential } from "../../supabase/functions/_shared/coachCredentials.ts";
Deno.test(
  "local service-role credential scoping and concurrent BYO reservations",
  async () => {
    const connection = Deno.env.get("SUPABASE_DB_URL");
    if (!connection) throw new Error("local_database_required");
    const target = new URL(connection);
    if (
      !["127.0.0.1", "localhost"].includes(target.hostname) ||
      target.port !== "55322"
    )
      throw new Error("isolated_local_database_required");
    const sql = postgres(connection, { max: 10, prepare: false });
    const owner = "50000000-0000-4000-8000-000000000001";
    const other = "50000000-0000-4000-8000-000000000002";
    try {
      await sql`INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES (${owner},'authenticated','authenticated','coach-edge@example.test',now(),now())`;
      await sql`INSERT INTO public.profiles (id,plan_tier) VALUES (${owner},'free') ON CONFLICT (id) DO NOTHING`;
    if ((await loadCoachCredential(owner)) !== null)
        throw new Error("default_off_resolver_not_null");
      await sql`UPDATE public.coach_provider_rollout SET coach_providers_enabled=true WHERE id`;
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`SELECT set_config('request.jwt.claim.sub',${owner},true)`;
        await tx`SELECT public.set_coach_api_key('openai_compatible','synthetic-edge-key-1234','https://api.openai.com/v1','test-model')`;
      });
      const credential = await loadCoachCredential(owner);
      if (
        !credential ||
        credential.provider !== "openai_compatible" ||
        credential.key !== "synthetic-edge-key-1234"
      )
        throw new Error("owner_credential_resolution_failed");
      if ((await loadCoachCredential(other)) !== null)
        throw new Error("credential_cross_owner_leak");
      const reservations = await Promise.all(
        Array.from({ length: 105 }, () =>
          sql.begin(async (tx) => {
            await tx`SET LOCAL ROLE service_role`;
            const rows =
              await tx`SELECT public.reserve_coach_byo_usage(${owner}::uuid) AS result`;
            return rows[0].result.allowed;
          }),
        ),
      );
      if (reservations.filter(Boolean).length !== 100)
        throw new Error("concurrent_quota_not_exactly_100");
      const counts =
        await sql`SELECT message_count FROM public.ai_usage_logs WHERE user_id=${owner}::uuid`;
      if (counts[0]?.message_count !== 100)
        throw new Error("concurrent_aggregate_count_wrong");
      await sql`UPDATE public.coach_provider_rollout SET coach_providers_enabled=false WHERE id`;
      if ((await loadCoachCredential(owner)) !== null)
        throw new Error("disabled_rollout_still_decrypts");
    } finally {
      await sql`DELETE FROM auth.users WHERE id=${owner}::uuid`;
      await sql`DELETE FROM public.ai_usage_logs WHERE user_id=${owner}::uuid`;
      await sql`UPDATE public.coach_provider_rollout SET coach_providers_enabled=false WHERE id`;
      await sql.end();
    }
  },
);

Deno.test(
  "local hosted quota accepts exactly 25 of 30 concurrent requests",
  async () => {
    const connection = Deno.env.get("SUPABASE_DB_URL");
    if (!connection) throw new Error("local_database_required");
    const target = new URL(connection);
    if (
      !["127.0.0.1", "localhost"].includes(target.hostname) ||
      target.port !== "55322"
    )
      throw new Error("isolated_local_database_required");
    const sql = postgres(connection, { max: 10, prepare: false });
    const owner = "50000000-0000-4000-8000-000000000003";
    try {
      await sql`INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES (${owner},'authenticated','authenticated','hosted-concurrency@example.test',now(),now())`;
      await sql`INSERT INTO public.profiles (id,plan_tier) VALUES (${owner},'pro')`;
      await sql`UPDATE public.coach_provider_rollout SET hosted_coach_enabled=true WHERE id`;
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`SELECT set_config('request.jwt.claim.sub',${owner},true)`;
        await tx`SELECT public.select_hosted_coach(true)`;
      });
      const reservations = await Promise.all(
        Array.from({ length: 30 }, () =>
          sql.begin(async (tx) => {
            await tx`SET LOCAL ROLE service_role`;
            const rows =
              await tx`SELECT public.reserve_hosted_coach_usage(${owner}::uuid) AS result`;
            return rows[0].result.allowed;
          }),
        ),
      );
      if (reservations.filter(Boolean).length !== 25)
        throw new Error("hosted_concurrent_quota_not_exactly_25");
      const rows =
        await sql`SELECT message_count FROM public.ai_usage_logs WHERE user_id=${owner}::uuid`;
      if (rows[0]?.message_count !== 25)
        throw new Error("hosted_aggregate_count_wrong");
    } finally {
      await sql`DELETE FROM auth.users WHERE id=${owner}::uuid`;
      await sql`DELETE FROM public.ai_usage_logs WHERE user_id=${owner}::uuid`;
      await sql`UPDATE public.coach_provider_rollout SET hosted_coach_enabled=false WHERE id`;
      await sql.end();
    }
  },
);
