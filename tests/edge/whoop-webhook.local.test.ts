// Actual handler. No real provider credential, user, network, health data or event.
let handler!: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
  return {};
}) as typeof Deno.serve;
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  WHOOP_CLIENT_SECRET: "synthetic-whoop-secret",
}))
  Deno.env.set(k, v);
let writes: Record<string, unknown>[] = [],
  duplicate = false,
  fail = false;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (
    url.hostname !== "synthetic.supabase.invalid" ||
    !url.pathname.endsWith("/whoop_webhook_events") ||
    init?.method !== "POST"
  )
    throw Error("UNEXPECTED NETWORK");
  writes.push(JSON.parse(String(init.body)));
  return Response.json(
    duplicate ? { code: "23505" } : fail ? { code: "XX000" } : null,
    { status: duplicate ? 409 : fail ? 500 : 201 },
  );
};
await import("../../supabase/functions/whoop-webhook/index.ts");
Deno.serve = originalServe;
const raw = JSON.stringify({
  user_id: 10129,
  id: "synthetic-object",
  type: "sleep.updated",
  trace_id: "synthetic-trace",
  ignored_private_field: "do not store",
});
async function request(
  body = raw,
  timestamp = String(Date.now()),
  secret = "synthetic-whoop-secret",
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(timestamp + body),
    ),
  );
  return new Request("http://localhost/whoop", {
    method: "POST",
    headers: {
      "x-whoop-signature": btoa(String.fromCharCode(...sig)),
      "x-whoop-signature-timestamp": timestamp,
    },
    body,
  });
}
Deno.test("unsigned calls cannot reach privileged event writes", async () => {
  writes = [];
  const r = await handler(
    new Request("http://localhost/whoop", { method: "POST", body: raw }),
  );
  if (r.status !== 401 || writes.length)
    throw Error("Signature required before database");
});
Deno.test(
  "wrong-secret, stale, future and reserialized-body signatures are denied",
  async () => {
    for (const req of [
      await request(raw, undefined, "wrong"),
      await request(raw, String(Date.now() - 600000)),
      await request(raw, String(Date.now() + 600000)),
    ]) {
      writes = [];
      if ((await handler(req)).status !== 401 || writes.length)
        throw Error("Invalid signature accepted");
    }
    const signed = await request();
    const changed = new Request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: " " + raw,
    });
    writes = [];
    if ((await handler(changed)).status !== 401 || writes.length)
      throw Error("Raw body must be bound");
  },
);
Deno.test(
  "configured secret is required and never falls back to public acceptance",
  async () => {
    Deno.env.delete("WHOOP_CLIENT_SECRET");
    writes = [];
    const r = await handler(await request());
    if (r.status !== 503 || writes.length)
      throw Error("Missing secret must fail closed");
    Deno.env.set("WHOOP_CLIENT_SECRET", "synthetic-whoop-secret");
  },
);
Deno.test(
  "valid signed provider metadata is stored with a dedupe key and no arbitrary fields",
  async () => {
    writes = [];
    duplicate = fail = false;
    const r = await handler(await request());
    if (
      r.status !== 200 ||
      writes.length !== 1 ||
      !/^[a-f0-9]{64}$/.test(String(writes[0].delivery_key)) ||
      JSON.stringify(writes).includes("ignored_private_field")
    )
      throw Error("Signed event contract");
  },
);
Deno.test(
  "duplicate delivery is acknowledged without introducing a second identity",
  async () => {
    writes = [];
    duplicate = true;
    const r = await handler(await request());
    if (r.status !== 200 || !(await r.json()).duplicate)
      throw Error("Replay contract");
    duplicate = false;
  },
);
Deno.test(
  "invalid JSON/schema and oversized payloads cannot be stored",
  async () => {
    for (const body of [
      "{",
      JSON.stringify({
        user_id: 9007199254740992,
        id: "x",
        type: "sleep.updated",
        trace_id: "trace",
      }),
      "x".repeat(17000),
    ]) {
      writes = [];
      const r = await handler(await request(body));
      if (![400, 413].includes(r.status) || writes.length)
        throw Error("Payload bounds");
    }
  },
);
Deno.test(
  "event store failure returns a retryable error without logging payloads",
  async () => {
    fail = true;
    const r = await handler(await request());
    if (r.status !== 503) throw Error("Retry failed event");
    fail = false;
  },
);
