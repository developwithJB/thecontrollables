import { MemoryRouter } from "react-router-dom";
import { HostedCoachCard } from "@/components/settings/HostedCoachCard";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CoachSettingsCard } from "@/components/settings/CoachSettingsCard";
import { supabase } from "@/integrations/supabase/client";
import "@/index.css";
// Local UI fixture only. No network, keys or user accounts; database permissions
// are verified independently in tests/database/coach-provider-security.sql.
const owner = "coach-ui-test-owner";
let settings: Record<string, unknown> | null = null;
let hostedSelected = false;
const hosted = new URLSearchParams(location.search).has("hosted");
const off = new URLSearchParams(location.search).has("off");
window.__FEATURE_FLAG_OVERRIDES__ = {
  hosted_coach_enabled: hosted && !off,
  coach_providers_enabled: !hosted && !off,
};
Object.assign(supabase.auth, {
  getUser: async () => ({ data: { user: { id: owner } }, error: null }),
});
Object.assign(supabase, {
  rpc: async (name: string, args: Record<string, string> = {}) => {
    if (name === "get_hosted_coach_status")
      return {
        data: {
          enabled: !new URLSearchParams(location.search).has("serverOff"),
          entitled:
            (new URLSearchParams(location.search).get("tier") ?? "pro") ===
            "pro",
          selected: hostedSelected,
        },
        error: null,
      };
    if (name === "coach_providers_available")
      return {
        data: !new URLSearchParams(location.search).has("serverOff"),
        error: null,
      };
    if (new URLSearchParams(location.search).has("fail"))
      return { data: null, error: { message: "synthetic failure" } };
    if (name === "select_hosted_coach")
      hostedSelected = Boolean(args.p_selected);
    if (name === "set_coach_api_key")
      settings = {
        user_id: owner,
        provider: args.p_provider,
        base_url: args.p_base_url,
        model: args.p_model,
        last4: args.p_key.slice(-4),
        persona_tone: "balanced",
        depth: "standard",
        updated_at: new Date().toISOString(),
      };
    if (name === "clear_coach_api_key" && settings)
      settings = {
        ...settings,
        provider: "lovable_gateway",
        base_url: null,
        last4: null,
      };
    if (name === "save_coach_preferences")
      settings = {
        ...settings,
        user_id: owner,
        model: args.p_model,
        persona_tone: args.p_tone,
        depth: args.p_depth,
      };
    return { data: null, error: null };
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: settings, error: null }),
      }),
    }),
  }),
});
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <QueryClientProvider client={client}>
      <main className="dark min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto max-w-xl space-y-4">
          <p>Local QA — mocked settings only</p>
          <HostedCoachCard userId={owner} />
          <CoachSettingsCard userId={owner} />
        </div>
      </main>
    </QueryClientProvider>
  </MemoryRouter>,
);
