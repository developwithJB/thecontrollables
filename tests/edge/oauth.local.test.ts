// Actual OAuth starts/callbacks; provider exchanges and database/auth are fixtures.
// No real credentials or provider permissions are used.
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  SUPABASE_ANON_KEY: "synthetic-anon",
  FITBIT_CLIENT_ID: "synthetic",
  FITBIT_CLIENT_SECRET: "synthetic",
  OURA_CLIENT_ID: "synthetic",
  OURA_CLIENT_SECRET: "synthetic",
  WHOOP_CLIENT_ID: "synthetic",
  WHOOP_CLIENT_SECRET: "synthetic",
  GOOGLE_CLIENT_ID: "synthetic",
  GOOGLE_CLIENT_SECRET: "synthetic",
}))
  Deno.env.set(k, v);
type Row = {
  state_hash: string;
  user_id: string;
  provider: string;
  return_origin: string;
  expires_at: string;
};
let rows = new Map<string, Row>(),
  identity = owner,
  exchanges = 0,
  writes: Record<string, unknown>[] = [];
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
globalThis.fetch = async (input, init) => {
  const u = new URL(String(input)),
    method = init?.method || "GET";
  if (u.hostname === "synthetic.supabase.invalid") {
    if (u.pathname === "/auth/v1/user")
      return json({ id: identity, email: "synthetic@qa.invalid" });
    if (u.pathname === "/rest/v1/oauth_state_requests") {
      if (method === "POST") {
        const row = JSON.parse(String(init?.body)) as Row;
        for (const [key, value] of rows)
          if (value.user_id === row.user_id && value.provider === row.provider)
            rows.delete(key);
        rows.set(row.state_hash, row);
        return json(null);
      }
      const hash = u.searchParams.get("state_hash")?.slice(3),
        row = hash ? rows.get(hash) : null;
      const uid = u.searchParams.get("user_id")?.slice(3);
      const providerFilter = u.searchParams.get("provider");
      const found =
        row &&
        row.expires_at > new Date().toISOString() &&
        (!uid || uid === row.user_id) &&
        (!providerFilter || providerFilter.includes(row.provider))
          ? row
          : null;
      if (method === "DELETE" && found) rows.delete(found.state_hash);
      return json(found);
    }
    if (
      [
        "/rest/v1/wearable_connections",
        "/rest/v1/integration_connections",
      ].includes(u.pathname) &&
      method === "POST"
    ) {
      writes.push(JSON.parse(String(init?.body)));
      return json(null);
    }
    throw Error("UNMOCKED LOCAL PATH " + u.pathname);
  }
  if (
    [
      "api.fitbit.com",
      "api.ouraring.com",
      "api.prod.whoop.com",
      "oauth2.googleapis.com",
    ].includes(u.hostname)
  ) {
    if (u.pathname.includes("profile"))
      return json({ user_id: "synthetic-provider" });
    exchanges++;
    return json({
      access_token: "SYNTHETIC_TOKEN",
      refresh_token: "SYNTHETIC_REFRESH",
      expires_in: 3600,
      scope: "sleep",
    });
  }
  if (u.hostname === "www.googleapis.com")
    return json({ email: "synthetic-provider@qa.invalid" });
  throw Error("NETWORK DENIED " + u.hostname);
};
let captured!: (req: Request) => Promise<Response>;
const original = Deno.serve;
Deno.serve = ((fn: typeof captured) => {
  captured = fn;
  return {};
}) as typeof Deno.serve;
await import("../../supabase/functions/wearable-oauth-start/index.ts");
const startWearable = captured;
await import("../../supabase/functions/wearable-oauth-callback/index.ts");
const finishWearable = captured;
await import("../../supabase/functions/integration-oauth-start/index.ts");
const startIntegration = captured;
await import("../../supabase/functions/integration-oauth-callback/index.ts");
const finishIntegration = captured;
Deno.serve = original;
const assert = (v: unknown) => {
  if (!v) throw Error("assertion failed");
};
const post = (data: unknown, auth = true) =>
  new Request("http://localhost/oauth", {
    method: "POST",
    headers: {
      Origin: "https://thedashboard.agbcoaching.com",
      "content-type": "application/json",
      ...(auth ? { Authorization: "Bearer synthetic-user" } : {}),
    },
    body: JSON.stringify(data),
  });
async function begin(provider = "fitbit") {
  const r = await (
    provider === "google_calendar" ? startIntegration : startWearable
  )(post({ provider, user_id: other, redirectUri: "https://evil.invalid" }));
  assert(r.status === 200);
  const state = new URL((await r.json()).url).searchParams.get("state")!;
  assert(/^[a-f0-9]{64}$/.test(state));
  return state;
}
function test(name: string, fn: () => Promise<void>) {
  Deno.test(name, async () => {
    rows = new Map();
    identity = owner;
    exchanges = 0;
    writes = [];
    await fn();
  });
}
test("authenticated start stores only a hash and server-derived owner/origin", async () => {
  const state = await begin();
  const row = [...rows.values()][0];
  assert(
    row.user_id === owner &&
      row.return_origin === "https://thedashboard.agbcoaching.com",
  );
  assert(row.state_hash !== state && rows.size === 1);
  await begin();
  assert(rows.size === 1);
});
test("legacy unsigned callback cannot exchange or attach credentials", async () => {
  const state = btoa(JSON.stringify({ user_id: other, provider: "fitbit" }));
  const r = await finishWearable(
    new Request(
      "http://localhost/oauth?code=synthetic&state=" +
        encodeURIComponent(state),
    ),
  );
  assert(r.status === 303 && exchanges === 0 && writes.length === 0);
  assert(
    r.headers
      .get("location")
      ?.startsWith("https://thedashboard.agbcoaching.com/"),
  );
});
test("GET callback only returns to a trusted origin and leaves nonce unconsumed", async () => {
  const state = await begin();
  const r = await finishWearable(
    new Request("http://localhost/oauth?code=synthetic&state=" + state),
  );
  assert(
    r.status === 303 &&
      r.headers.get("location")?.includes("/wellness#oauth_return=wearable"),
  );
  assert(exchanges === 0 && writes.length === 0 && rows.size === 1);
});
test("token exchange requires authenticated initiating UUID and consumes state once", async () => {
  const state = await begin();
  assert(
    (await finishWearable(post({ state, code: "synthetic" }, false))).status ===
      401,
  );
  identity = other;
  assert(
    (await finishWearable(post({ state, code: "synthetic" }))).status === 400,
  );
  assert(exchanges === 0 && rows.size === 1);
  identity = owner;
  assert(
    (await finishWearable(post({ state, code: "synthetic" }))).status === 200,
  );
  assert(exchanges === 1 && writes[0].user_id === owner);
  assert(
    (await finishWearable(post({ state, code: "synthetic" }))).status === 400,
  );
  assert(exchanges === 1);
});
test("expired, tampered and wrong-family state fail before provider exchange", async () => {
  const state = await begin();
  assert(
    (await finishIntegration(post({ state, code: "synthetic" }))).status ===
      400,
  );
  assert(
    (await finishWearable(post({ state: "b".repeat(64), code: "synthetic" })))
      .status === 400,
  );
  for (const row of rows.values()) row.expires_at = "2000-01-01";
  assert(
    (await finishWearable(post({ state, code: "synthetic" }))).status === 400,
  );
  assert(exchanges === 0 && writes.length === 0);
});
test("Google integration uses the same UUID-owned finalization boundary", async () => {
  const state = await begin("google_calendar");
  identity = other;
  assert(
    (await finishIntegration(post({ state, code: "synthetic" }))).status ===
      400,
  );
  identity = owner;
  const r = await finishIntegration(post({ state, code: "synthetic" }));
  assert(
    r.status === 200 &&
      writes[0].user_id === owner &&
      writes[0].provider === "google_calendar",
  );
  assert(
    (await finishIntegration(post({ state, code: "synthetic" }))).status ===
      400,
  );
});

Deno.test(
  "provider cancellation returns safely without credential exchange",
  async () => {
    rows = new Map();
    identity = owner;
    exchanges = 0;
    writes = [];
    const state = await begin();
    const r = await finishWearable(
      new Request("http://localhost/oauth?error=denied&state=" + state),
    );
    assert(
      r.status === 303 &&
        r.headers.get("location") ===
          "https://thedashboard.agbcoaching.com/wellness?wearable_error=restart_connection",
    );
    assert(exchanges === 0 && writes.length === 0);
  },
);
for (const provider of ["oura", "whoop"])
  Deno.test(provider + " finalization remains owner-bound", async () => {
    rows = new Map();
    identity = owner;
    exchanges = 0;
    writes = [];
    const state = await begin(provider);
    const r = await finishWearable(post({ state, code: "synthetic" }));
    assert(
      r.status === 200 &&
        writes[0].provider === provider &&
        writes[0].user_id === owner,
    );
  });
