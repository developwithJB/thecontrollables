import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createBudgetedGateway } from "./hostedAiBudget.ts";
// Only authenticated handlers supply owner IDs derived from auth.getUser/claims.
// Never pass a request-body owner, a cron key, or a client tier into this helper.
export function hostedGateway(userId: string, feature: string): typeof fetch {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  return createBudgetedGateway(userId, feature, (name, args) =>
    admin.rpc(name, args),
  );
}
