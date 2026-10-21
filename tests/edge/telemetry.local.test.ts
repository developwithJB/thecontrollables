import { capturedHandler } from "./serveStub.ts";
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  SUPABASE_ANON_KEY: "synthetic-anon",
}))
  Deno.env.set(k, v);
let calls: { path: string; body: Record<string, unknown> }[] = [],
  verified = true,
  slot = true,
  fail = false;
const owner = "00000000-0000-4000-8000-000000000001";
globalThis.fetch = async (input, init) => {
  const u = new URL(String(input));
  if (u.hostname !== "synthetic.supabase.invalid")
    throw Error("NETWORK DENIED");
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  calls.push({ path: u.pathname, body });
  const data =
    u.pathname === "/auth/v1/user"
      ? verified
        ? { id: owner }
        : { message: "invalid" }
      : u.pathname.endsWith("take_telemetry_ingest_slot")
        ? slot
        : null;
  return new Response(
    JSON.stringify(fail ? { message: "unavailable", code: "XX000" } : data),
    {
      status: fail
        ? 500
        : u.pathname === "/auth/v1/user" && !verified
          ? 401
          : 200,
      headers: { "content-type": "application/json" },
    },
  );
};
await import("../../supabase/functions/ingest-telemetry/index.ts");
const assert = (v: unknown) => {
  if (!v) throw Error("assertion failed");
};
const req = (
  body: unknown,
  token = "synthetic-anon",
  origin = "http://127.0.0.1:8085",
) =>
  new Request("http://localhost/ingest-telemetry", {
    method: "POST",
    headers: { origin, Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
const event = {
  kind: "event",
  payload: {
    event_type: "growth",
    event_name: "book_link_click",
    user_id: "spoof",
    event_data: { placement: "hero", email: "private@example.com" },
  },
};
function test(name: string, fn: () => Promise<void>) {
  Deno.test(name, async () => {
    calls = [];
    verified = true;
    slot = true;
    fail = false;
    await fn();
  });
}
test("anonymous growth uses bounded ingestion without a spoofed owner", async () => {
  const r = await capturedHandler(req(event));
  assert(r.status === 202);
  const insert = calls.find((c) => c.path === "/rest/v1/app_events")!;
  assert(insert.body.user_id === null);
  assert(JSON.stringify(insert).includes("hero"));
  assert(!JSON.stringify(insert).includes("private"));
  assert(
    String(calls.find((c) => c.path.includes("/rpc/"))!.body.p_actor).match(
      /^[a-f0-9]{64}$/,
    ),
  );
});
test("authenticated owner is validated by Auth", async () => {
  assert((await capturedHandler(req(event, "synthetic-user"))).status === 202);
  assert(
    calls.find((c) => c.path === "/rest/v1/app_events")!.body.user_id === owner,
  );
});
test("invalid JWT cannot downgrade into anonymous ingestion", async () => {
  verified = false;
  assert((await capturedHandler(req(event, "expired"))).status === 401);
  assert(!calls.some((c) => c.path.includes("/rest/")));
});
test("invalid origins and oversized payloads cannot write", async () => {
  assert(
    (
      await capturedHandler(
        req(event, "synthetic-anon", "https://evil.invalid"),
      )
    ).status === 403,
  );
  assert(
    (await capturedHandler(req({ text: "x".repeat(9000) }))).status === 413,
  );
  assert(calls.length === 0);
});
test("rate exhaustion and database errors fail closed", async () => {
  slot = false;
  assert((await capturedHandler(req(event))).status === 429);
  assert(!calls.some((c) => c.path === "/rest/v1/app_events"));
  fail = true;
  assert((await capturedHandler(req(event))).status === 503);
});
test("preview CORS allows POST preflight", async () => {
  const r = await capturedHandler(
    new Request("http://localhost/ingest-telemetry", {
      method: "OPTIONS",
      headers: { origin: "https://preview--thecontrollables.lovable.app" },
    }),
  );
  assert(r.status === 204);
  assert(r.headers.get("access-control-allow-methods")?.includes("POST"));
  assert(calls.length === 0);
});
