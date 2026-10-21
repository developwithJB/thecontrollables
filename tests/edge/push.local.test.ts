// Actual handler; all network calls are intercepted. Never sends a notification.
const originalServe = Deno.serve;
let handler: (req: Request) => Promise<Response>;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
  return {};
}) as typeof Deno.serve;
for (const [key, value] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  VAPID_PUBLIC_KEY: "synthetic-public",
}))
  Deno.env.set(key, value);
let outbound = 0,
  allowOutbound = false;
let queries = 0,
  endpoint = "https://127.0.0.1/private",
  optedIn = true,
  claimed = false;
let subscriberKey = "synthetic",
  subscriberAuth = "synthetic";
const owner = "00000000-0000-4000-8000-000000000001";
const NativeDate = Date;
//07 UTC makes the delivery window deterministic, without any real push fetch.
globalThis.Date = class extends NativeDate {
  constructor(value?: string | number) {
    super(value === undefined ? "2026-10-21T07:15:00Z" : value);
  }
  static override now() {
    return new NativeDate("2026-10-21T07:15:00Z").getTime();
  }
} as DateConstructor;
globalThis.fetch = async (input) => {
  const u = new URL(String(input));
  if (u.hostname === "fcm.googleapis.com" && allowOutbound) {
    outbound++;
    return new Response(null, { status: 201 });
  }
  if (u.hostname !== "synthetic.supabase.invalid")
    throw Error("EXTERNAL NETWORK DENIED");
  queries++;
  let data: unknown = [];
  if (u.pathname.endsWith("/push_subscriptions"))
    data = [
      {
        id: "synthetic-sub",
        user_id: owner,
        endpoint,
        p256dh_key: subscriberKey,
        auth_key: subscriberAuth,
      },
    ];
  if (u.pathname.endsWith("/profiles"))
    data = [{ id: owner, timezone: "UTC", push_nudges_enabled: optedIn }];
  if (u.pathname.endsWith("/email_nudge_logs")) data = null;
  if (u.pathname.endsWith("/claim_push_nudge")) data = claimed;
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
};
await import("../../supabase/functions/send-push-nudge/index.ts");
Deno.serve = originalServe;
const call = (body: unknown = {}, token?: string) =>
  handler(
    new Request("http://localhost/push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
Deno.test(
  "anonymous or signed-in users cannot read subscriptions or trigger sends",
  async () => {
    for (const token of [undefined, "synthetic-anon", "synthetic-user"]) {
      queries = 0;
      const r = await call({}, token);
      if (r.status !== 401 || queries)
        throw Error("Sender must fail before privileged reads");
    }
  },
);
Deno.test(
  "public key lookup is the only public action and reads no subscription",
  async () => {
    queries = 0;
    const r = await call({ action: "get_vapid_key" });
    if (
      r.status !== 200 ||
      (await r.json()).vapidPublicKey !== "synthetic-public" ||
      queries
    )
      throw Error("Public key contract");
  },
);
Deno.test(
  "sender rejects unsupported methods and oversized requests",
  async () => {
    queries = 0;
    const get = await handler(new Request("http://localhost/push"));
    const large = await call(
      { padding: "x".repeat(9000) },
      "synthetic-service",
    );
    if (get.status !== 405 || large.status !== 413 || queries)
      throw Error("Request bounds");
  },
);
Deno.test(
  "existing service credential cannot dispatch to arbitrary stored endpoints",
  async () => {
    queries = 0;
    endpoint = "https://127.0.0.1/private";
    const r = await call({}, "synthetic-service");
    if (r.status !== 200 || (await r.json()).sent !== 0)
      throw Error("Untrusted endpoint must not send");
  },
);
Deno.test("opted-out account never claims or sends", async () => {
  queries = 0;
  optedIn = false;
  endpoint = "https://fcm.googleapis.com/fcm/send/synthetic";
  const r = await call({}, "synthetic-service");
  if (r.status !== 200 || (await r.json()).sent !== 0)
    throw Error("Consent required");
  optedIn = true;
});
Deno.test("a denied or replayed daily claim cannot send", async () => {
  queries = 0;
  claimed = false;
  endpoint = "https://fcm.googleapis.com/fcm/send/synthetic";
  const r = await call({}, "synthetic-service");
  const body = await r.json();
  if (r.status !== 200 || body.sent !== 0 || body.errors.length)
    throw Error("Claim must precede outbound request");
});

Deno.test(
  "authorized opted-in claimed delivery encrypts and dispatches only to an intercepted vendor",
  async () => {
    const encode = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
    const vapid = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const jwk = await crypto.subtle.exportKey("jwk", vapid.privateKey);
    Deno.env.set(
      "VAPID_PUBLIC_KEY",
      encode(
        new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey)),
      ),
    );
    Deno.env.set("VAPID_PRIVATE_KEY", jwk.d!);
    const client = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    subscriberKey = encode(
      new Uint8Array(await crypto.subtle.exportKey("raw", client.publicKey)),
    );
    subscriberAuth = encode(crypto.getRandomValues(new Uint8Array(16)));
    claimed = true;
    optedIn = true;
    allowOutbound = true;
    outbound = 0;
    endpoint = "https://fcm.googleapis.com/fcm/send/synthetic";
    const r = await call({}, "synthetic-service");
    const data = await r.json();
    if (r.status !== 200 || data.sent !== 1 || outbound !== 1)
      throw Error("Expected one intercepted encrypted delivery");
    allowOutbound = false;
  },
);
