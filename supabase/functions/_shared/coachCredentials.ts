import postgres from "npm:postgres@3.4.9";
import type { CoachCredential } from "./coachProvider.ts";

// Direct server DB access avoids exposing Vault through PostgREST or a decrypt RPC.
// Only this authenticated ai-chat call supplies userId; no request-body user id is accepted.
export async function loadCoachCredential(
  userId: string,
): Promise<CoachCredential | null> {
  const connection = Deno.env.get("SUPABASE_DB_URL");
  if (!connection) throw new Error("coach_database_unavailable");
  const sql = postgres(connection, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 5,
  });
  try {
    const rows = await sql.begin(async (transaction) => {
      await transaction`SET LOCAL ROLE service_role`;
      return await transaction`
      SELECT s.provider, s.base_url AS "baseUrl", s.model, s.persona_tone AS tone,
        s.depth, v.decrypted_secret AS key
      FROM public.coach_provider_settings s
      JOIN vault.decrypted_secrets v ON v.id = s.vault_secret_id
      WHERE s.user_id = ${userId}::uuid
        AND s.provider IN ('openai_compatible','anthropic')
        AND EXISTS (SELECT 1 FROM public.coach_provider_rollout WHERE id AND coach_providers_enabled)
      LIMIT 1`;
    });
    return rows[0] ? (rows[0] as unknown as CoachCredential) : null;
  } finally {
    await sql.end({ timeout: 1 });
  }
}
