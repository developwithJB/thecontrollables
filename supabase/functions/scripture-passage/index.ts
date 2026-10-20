import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createScriptureHandler } from "./handler.ts";
const client = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);
Deno.serve(
  createScriptureHandler({
    config: {
      enabled: Deno.env.get("YOUVERSION_API_ENABLED") === "true",
      commercialApproval: Deno.env.get("YOUVERSION_COMMERCIAL_APPROVAL") ?? "",
      appKey: Deno.env.get("YVP_APP_KEY") ?? "",
      bibleId: Deno.env.get("YOUVERSION_BIBLE_ID") ?? "",
    },
    request: fetch,
    authenticate: async (token) => {
      const { data, error } = await client.auth.getUser(token);
      return !error && !!data.user?.email_confirmed_at;
    },
  }),
);
