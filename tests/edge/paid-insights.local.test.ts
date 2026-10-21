// Actual entry points; auth/database/provider traffic is entirely intercepted.
const originalServe = Deno.serve;
let current!: (req: Request) => Promise<Response>;
Deno.serve = ((fn: typeof current) => {
  current = fn;
  return {};
}) as typeof Deno.serve;
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_ANON_KEY: "synthetic-anon",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  LOVABLE_API_KEY: "synthetic-provider",
}))
  Deno.env.set(k, v);
const owner = "00000000-0000-4000-8000-000000000001";
let tier = "free",
  authorityFails = false,
  tableReads = 0,
  providerCalls = 0;
let requestedOwner: string | undefined;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname !== "synthetic.supabase.invalid") {
    providerCalls++;
    throw Error("EXTERNAL NETWORK DENIED");
  }
  if (url.pathname === "/auth/v1/user") return Response.json({ id: owner });
  if (url.pathname.endsWith("/hosted_ai_plan")) {
    requestedOwner = JSON.parse(String(init?.body)).p_user_id;
    return Response.json(authorityFails ? { message: "unavailable" } : tier, {
      status: authorityFails ? 500 : 200,
    });
  }
  tableReads++;
  return Response.json(
    url.pathname.endsWith("/daily_briefings")
      ? { content: "synthetic cached review" }
      : [],
  );
};
const handlers: Record<string, typeof current> = {};
await import("../../supabase/functions/generate-insights/index.ts");
handlers["generate-insights"]=current;
await import("../../supabase/functions/generate-snapshot-insight/index.ts");
handlers["generate-snapshot-insight"]=current;
await import("../../supabase/functions/generate-weekly-review/index.ts");
handlers["generate-weekly-review"]=current;
Deno.serve = originalServe;
const request = (auth = true) =>
  new Request("http://localhost/insight", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { Authorization: "Bearer synthetic-user" } : {}),
    },
    body: JSON.stringify({
      userId: "forged",
      plan_tier: "pro",
      sessionId: "synthetic",
    }),
  });
for (const [feature, handler] of Object.entries(handlers)) {
  Deno.test(
    feature + " rejects a free account before cache/data/provider access",
    async () => {
      tier = "free";
      authorityFails = false;
      tableReads = providerCalls = 0;
      const r = await handler(request());
      if (
        r.status !== 403 ||
        tableReads ||
        providerCalls ||
        requestedOwner !== owner
      )
        throw Error("Current owner paid authority must precede data or spend");
    },
  );
  Deno.test(
    feature + " fails closed when paid authority is unavailable",
    async () => {
      authorityFails = true;
      tableReads = providerCalls = 0;
      const r = await handler(request());
      if (r.status !== 503 || tableReads || providerCalls)
        throw Error("No authority means no access");
      authorityFails = false;
    },
  );
  Deno.test(
    feature + " requires authentication before plan lookup",
    async () => {
      tableReads = providerCalls = 0;
      requestedOwner = undefined;
      const r = await handler(request(false));
      if (r.status !== 401 || requestedOwner || tableReads || providerCalls)
        throw Error("Authentication required");
    },
  );
}
Deno.test(
  "current Pro may read its cached weekly review without spending again",
  async () => {
    tier = "pro";
    authorityFails = false;
    providerCalls = 0;
    const r = await handlers["generate-weekly-review"](request());
    const data = await r.json();
    if (r.status !== 200 || !data.cached || providerCalls)
      throw Error("Preserve paid cache");
  },
);
