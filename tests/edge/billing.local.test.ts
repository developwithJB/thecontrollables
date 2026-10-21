// Full edge handlers with synthetic credentials and a deny-by-default fetch.
// Stripe/Supabase runtime traffic NEVER leaves this process.
import { capturedHandler } from "./serveStub.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
const owner = "00000000-0000-4000-8000-000000000099";
for (const [name, value] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_ANON_KEY: "synthetic-anon-key",
  STRIPE_SECRET_KEY: "sk_test_SYNTHETIC_NOT_A_REAL_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
  STRIPE_PRICE_ID_PLUS: "price_plus_test",
  STRIPE_PRICE_ID_PRO: "price_legacy_test",
  STRIPE_PRICE_ID_PRO_ANNUAL: "price_annual_test",
  STRIPE_PRICE_ID_PRO_MONTHLY: "price_monthly_test",
  STRIPE_WEBHOOK_SECRET: "whsec_SYNTHETIC_NOT_REAL",
  CHECKOUT_ALLOWED_ORIGINS:
    "http://localhost:8085,https://thedashboard.agbcoaching.com",
}))
  Deno.env.set(name, value);
interface IO {
  path: string;
  method: string;
  body: URLSearchParams;
  json: Record<string, unknown>;
  key: string | null;
  stripeVersion: string | null;
}
let runtimeReady=true;
let appGrant: Record<string,unknown> | null=null;
let calls: IO[] = [],
  verified = true,
  customer = false,
  existing = false,
  mismatch = false,
  dbFailure = false,
  duplicate = false,
  unknownPrice = false,
  canceled = false;
function reset() {
  appGrant=null;
  runtimeReady=true;
  calls = [];
  verified = true;
  customer = false;
  existing = false;
  mismatch = false;
  dbFailure = false;
  duplicate = false;
  unknownPrice = false;
  canceled = false;
}
const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  const raw = String(init?.body ?? "");
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw);
  } catch {
    /* Stripe uses form encoding. */
  }
  const call = {
    path: url.pathname,
    method: init?.method ?? "GET",
    body: new URLSearchParams(raw),
    json,
    key: new Headers(init?.headers).get("idempotency-key"),
    stripeVersion: new Headers(init?.headers).get("stripe-version"),
  };
  calls.push(call);
  if (url.hostname === "synthetic.supabase.invalid") {
    if(url.pathname==="/rest/v1/hosted_ai_policy")return ok({enabled:runtimeReady});
    if(url.pathname==="/rest/v1/coach_provider_rollout")return ok({hosted_coach_enabled:runtimeReady});
    if (url.pathname === "/auth/v1/user")
      return ok({
        id: owner,
        email: "qa@local.invalid",
        email_confirmed_at: verified ? "2026-10-20T00:00:00Z" : null,
      });
    if (
      url.pathname === "/rest/v1/stripe_webhook_events" &&
      call.method === "GET"
    )
      return ok(duplicate ? { id: "evt_local" } : null);
    if (url.pathname === "/rest/v1/user_entitlements" && dbFailure)
      return ok({ message: "synthetic unavailable", code: "XX000" }, 500);
    if(url.pathname==="/rest/v1/user_entitlements" && call.method==="GET") return ok(appGrant);
    if (
      [
        "/rest/v1/user_entitlements",
        "/rest/v1/profiles",
        "/rest/v1/stripe_webhook_events",
      ].includes(url.pathname)
    )
      return ok(null);
  }
  if (url.hostname === "api.stripe.com") {
    if (url.pathname === "/v1/customers")
      return ok({ data: customer ? [{ id: "cus_local" }] : [] });
    if (url.pathname === "/v1/subscriptions")
      return ok({
        data: existing ? [{ id: "sub_local", status: "active" }] : [],
      });
    if (url.pathname.startsWith("/v1/prices/")) {
      const monthly = url.pathname.endsWith("price_monthly_test");
      return ok({
        id: url.pathname.split("/").at(-1),
        active: true,
        type: "recurring",
        currency: "usd",
        unit_amount: mismatch ? 999 : monthly ? 1499 : 11999,
        billing_scheme: "per_unit",
        recurring: {
          interval: mismatch ? "month" : monthly ? "month" : "year",
          interval_count: 1,
          usage_type: "licensed",
        },
      });
    }
    if (url.pathname === "/v1/checkout/sessions")
      return ok({
        id: "cs_test_local",
        url: "https://checkout.stripe.com/c/pay/cs_test_local",
      });
    if (url.pathname === "/v1/billing_portal/sessions")
      return ok({ url: "https://billing.stripe.com/p/session/test_local" });
    if (url.pathname === "/v1/subscriptions/sub_local")
      return ok({
        id: "sub_local",
        customer: "cus_local",
        status: canceled ? "canceled" : "active",
        cancel_at_period_end: false,
        metadata: { user_id: owner, plan_tier: "pro" },
        items: {
          data: [
            {
              price: { id: unknownPrice ? "unknown" : "price_annual_test" },
              current_period_start: 1700000000,
              current_period_end: 1800000000,
            },
          ],
        },
      });
  }
  throw Error(`UNMOCKED NETWORK DENIED: ${url.origin}${url.pathname}`);
};
await import("../../supabase/functions/create-checkout/index.ts");
const checkout = capturedHandler;
await import("../../supabase/functions/stripe-webhook/index.ts");
const webhook = capturedHandler;
await import("../../supabase/functions/check-payment/index.ts");
const checkPayment = capturedHandler;
const assert = (condition: unknown, message = "assertion failed") => {
  if (!condition) throw Error(message);
};
function request(body: Record<string, unknown>, auth = true) {
  return new Request("http://localhost/create-checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:8085",
      ...(auth ? { Authorization: "Bearer synthetic-user-token" } : {}),
    },
    body: JSON.stringify(body),
  });
}
function test(name: string, run: () => Promise<void>) {
  Deno.test(name, async () => {
    reset();
    await run();
  });
}
test("missing auth cannot reach Stripe", async () => {
  assert((await checkout(request({ tier: "pro" }, false))).status === 401);
  assert(!calls.some((c) => c.path.startsWith("/v1/")));
});
test("legacy app access is preserved without inventing an active subscription", async()=>{
  appGrant={source:"stripe",plan_tier:null,subscription_status:null,expires_at:null,granted_at:"2026-01-15T00:00:00Z"};
  const response=await checkPayment(request({}));
  const data=await response.json();
  assert(response.status===200 && data.isPaid===true && data.legacyAppAccess===true);
  assert(data.subscriptionStatus===null);
  assert(!calls.some(c=>c.method!=="GET" && ["/rest/v1/user_entitlements","/rest/v1/profiles"].includes(c.path)));
  assert(!calls.some(c=>c.path.startsWith("/v1/")));
});
test("a verified modern paid grant keeps its tier and active status",async()=>{
  appGrant={source:"stripe_subscription",plan_tier:"pro",subscription_status:"active",expires_at:"2099-01-01"};
  const response=await checkPayment(request({}));const data=await response.json();
  assert(data.isPaid===true && data.plan_tier==="pro" && data.legacyAppAccess===false && data.subscriptionStatus==="active");
});
test("checkout cannot replace a live untiered legacy grant",async()=>{
  appGrant={source:"stripe",plan_tier:null,subscription_status:null,expires_at:null};
  const response=await checkout(request({tier:"pro"}));
  assert(response.status===409 && (await response.json()).error_code==="legacy_access_review_required");
  assert(!calls.some(c=>c.path==="/v1/checkout/sessions"));
});
test("checkout fails closed if existing app access cannot be checked",async()=>{
  dbFailure=true;
  const response=await checkout(request({tier:"pro"}));
  assert(response.status===503 && (await response.json()).error_code==="access_verification_unavailable");
  assert(!calls.some(c=>c.path==="/v1/checkout/sessions"));
});
test("unverified account cannot start checkout", async () => {
  verified = false;
  assert((await checkout(request({ tier: "pro" }))).status === 401);
  assert(!calls.some((c) => c.path === "/v1/checkout/sessions"));
});
test("new Pro purchases stop when the hosted runtime is unavailable",async()=>{
  runtimeReady=false;const response=await checkout(request({tier:"pro"}));
  assert(response.status===503);assert((await response.json()).error_code==="pro_checkout_unavailable");
  assert(!calls.some(c=>c.path==="/v1/checkout/sessions"));
});
test("retired monthly mapping cannot satisfy annual offer", async () => {
  mismatch = true;
  const r = await checkout(request({ tier: "pro" }));
  assert(r.status === 503);
  assert((await r.json()).error_code === "price_contract_mismatch");
  assert(!calls.some((c) => c.path === "/v1/checkout/sessions"));
});
test("annual checkout uses exact server-owned price and keeps wallets automatic", async () => {
  assert(
    (
      await checkout(
        request({
          tier: "pro",
          interval: "year",
          price_id: "attacker",
          success_path: "//evil.invalid",
        }),
      )
    ).status === 200,
  );
  const call = calls.find((c) => c.path === "/v1/checkout/sessions")!;
  assert(call.body.get("line_items[0][price]") === "price_annual_test");
  assert(call.body.get("mode") === "subscription");
  assert(
    !Array.from(call.body.keys()).some((k) =>
      k.startsWith("payment_method_types"),
    ),
  );
  assert(
    call.body
      .get("success_url")!
      .startsWith("http://localhost:8085/dashboard?"),
  );
  assert(call.body.get("client_reference_id") === owner);
});
test("monthly checkout is USD 14.99 with distinct idempotency and metadata", async () => {
  assert(
    (await checkout(request({ tier: "pro", interval: "month" }))).status ===
      200,
  );
  const month = calls.find((c) => c.path === "/v1/checkout/sessions")!;
  assert(month.body.get("line_items[0][price]") === "price_monthly_test");
  assert(
    month.body.get("subscription_data[metadata][billing_interval]") === "month",
  );
  calls = [];
  await checkout(request({ tier: "pro", interval: "year" }));
  assert(
    month.key !== calls.find((c) => c.path === "/v1/checkout/sessions")!.key,
  );
});
test("existing subscribers go to the portal without a duplicate subscription", async () => {
  customer = existing = true;
  const r = await checkout(request({ tier: "pro" }));
  assert(r.status === 409);
  assert((await r.json()).error_code === "already_subscribed");
  assert(!calls.some((c) => c.path === "/v1/checkout/sessions"));
});
test("unsupported intervals never start a Stripe checkout", async () => {
  assert(
    (await checkout(request({ tier: "plus", interval: "month" }))).status ===
      400,
  );
  assert(calls.length === 0);
});
const stripe = new Stripe("sk_test_SYNTHETIC_NOT_REAL", {
  apiVersion: "2025-08-27.basil",
});
async function webhookRequest(eventType = "checkout.session.completed", apiVersion = "2025-08-27.basil", snapshot?: Record<string, unknown>) {
  const data =
    eventType === "checkout.session.completed"
      ? { client_reference_id: owner, subscription: "sub_local" }
      : { id: "sub_local", metadata: { user_id: owner }, status: "active" };
  const payload = JSON.stringify({
    id: "evt_local",
    type: eventType,
    api_version: apiVersion,
    livemode: false,
    data: { object: snapshot ?? data },
  });
  const signature = await Stripe.webhooks.generateTestHeaderStringAsync(
    { payload, secret: "whsec_SYNTHETIC_NOT_REAL" },
    Stripe.createSubtleCryptoProvider(),
  );
  return new Request("http://localhost/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}
test("invalid webhook signature cannot grant an entitlement", async () => {
  const r = await webhook(
    new Request("http://localhost/webhook", {
      method: "POST",
      headers: { "stripe-signature": "bad" },
      body: "{}",
    }),
  );
  assert(r.status === 400);
  assert(calls.length === 0);
});
test("signed test checkout writes Basil item periods and Pro entitlement", async () => {
  const r = await webhook(await webhookRequest());
  assert(r.status === 200);
  const write = calls.find((c) => c.path === "/rest/v1/user_entitlements")!;
  assert(write.json.plan_tier === "pro");
  assert(
    write.json.current_period_end === new Date(1800000000000).toISOString(),
  );
  assert(
    calls.some(
      (c) => c.path === "/rest/v1/stripe_webhook_events" && c.method === "POST",
    ),
  );
});
for (const eventType of ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]) {
  test(`2023-10-16 snapshot ${eventType} reconciles through the pinned current API`, async () => {
    canceled = eventType === "customer.subscription.deleted";
    const snapshot = eventType === "checkout.session.completed"
      ? { client_reference_id: owner, subscription: "sub_local" }
      : { id: "sub_local", customer: "cus_local", metadata: { user_id: owner }, status: canceled ? "canceled" : "active", current_period_start: 100, current_period_end: 200 };
    const response = await webhook(await webhookRequest(eventType, "2023-10-16", snapshot));
    assert(response.status === 200);
    const retrieve = calls.find(c => c.path === "/v1/subscriptions/sub_local");
    assert(retrieve?.stripeVersion === "2025-08-27.basil");
    const write = calls.find(c => c.path === "/rest/v1/user_entitlements");
    assert(write?.json.current_period_end === new Date(1800000000000).toISOString(), "must use retrieved state, not an old snapshot period");
    const profile = calls.find(c => c.path === "/rest/v1/profiles");
    assert(profile?.json.plan_tier === (canceled ? "free" : "pro"));
    const receipt = calls.find(c => c.path === "/rest/v1/stripe_webhook_events" && c.method === "POST");
    assert((receipt?.json.payload as Record<string, unknown>)?.api_version === "2023-10-16");
  });
}
test("duplicate webhook delivery does not grant twice", async () => {
  duplicate = true;
  const r = await webhook(await webhookRequest());
  assert(r.status === 200);
  assert((await r.json()).duplicate === true);
  assert(!calls.some((c) => c.path === "/rest/v1/user_entitlements"));
});
test("database failure makes Stripe retry instead of recording a false success", async () => {
  dbFailure = true;
  const r = await webhook(await webhookRequest());
  assert(r.status === 500);
  assert(
    !calls.some(
      (c) => c.path === "/rest/v1/stripe_webhook_events" && c.method === "POST",
    ),
  );
});
test("unknown price cannot grant Pro through metadata", async () => {
  unknownPrice = true;
  assert((await webhook(await webhookRequest())).status === 500);
  assert(!calls.some((c) => c.path === "/rest/v1/user_entitlements"));
});
test("late active event uses current canceled state and cannot restore Pro", async () => {
  canceled = true;
  assert(
    (await webhook(await webhookRequest("customer.subscription.updated")))
      .status === 200,
  );
  const profile = calls.find((c) => c.path === "/rest/v1/profiles")!;
  assert(profile.json.plan_tier === "free");
});

test("immediate cancellation cannot retain paid access through a future expiry",async()=>{
 appGrant={source:"stripe_subscription",plan_tier:"pro",subscription_status:"canceled",expires_at:"2099-01-01"};
 const response=await checkPayment(request({})); const data=await response.json();
 assert(data.isPaid===false && data.plan_tier===null);
});
