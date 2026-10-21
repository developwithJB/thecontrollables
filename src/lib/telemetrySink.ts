import { supabase } from "@/integrations/supabase/client";
// The server validates a small payload, derives identity, and owns write limits.
export async function sendTelemetry(
  kind: "event" | "page" | "error",
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.functions.invoke("ingest-telemetry", {
    body: { kind, payload },
  });
  if (error) throw new Error("telemetry_unavailable");
}
