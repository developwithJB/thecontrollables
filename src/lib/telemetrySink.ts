import { supabase } from "@/integrations/supabase/client";
// The server validates a small payload, derives identity, and owns write limits.
export async function sendTelemetry(
  kind: "event" | "page" | "error",
  payload: Record<string, unknown>,
) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("telemetry_unavailable");
  const { error } = await supabase.functions.invoke("ingest-telemetry", {
    // An explicit empty header prevents the SDK from substituting its public
    // API key as a user JWT. The handler accepts anonymous events and validates
    // every actual session token; failed sessions must never fall back to anon.
    headers: {
      Authorization: data.session?.access_token
        ? `Bearer ${data.session.access_token}`
        : "",
    },
    body: { kind, payload },
  });
  if (error) throw new Error("telemetry_unavailable");
}
