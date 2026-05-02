import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanTier = "plus" | "pro";
type PaymentState = "success" | "canceled";

const STRIPE_PRICE_IDS: Record<PlanTier, string> = {
  plus: Deno.env.get("STRIPE_PRICE_ID_PLUS") ?? "",
  pro: Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "",
};

const DEFAULT_ORIGIN = "https://thedashboard.agbcoaching.com";
const ALLOWED_ORIGINS = (
  Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
  ?? `${DEFAULT_ORIGIN},https://thedashboard.agbcoaching.com,http://localhost:5173`
)
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const json = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const normalizeTier = (value: unknown): PlanTier | null => {
  if (value === "plus" || value === "pro") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "plus" || normalized === "pro") return normalized;
  }
  return null;
};

const normalizePath = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  return trimmed;
};

const normalizeCheckoutSource = (value: unknown): string => {
  if (typeof value !== "string") return "unknown";
  const trimmed = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  if (!trimmed) return "unknown";
  return trimmed.slice(0, 64);
};

const resolveOrigin = (rawOrigin: string | null): string => {
  if (!rawOrigin) return DEFAULT_ORIGIN;

  try {
    const parsedOrigin = new URL(rawOrigin).origin;
    if (ALLOWED_ORIGINS.includes(parsedOrigin)) {
      return parsedOrigin;
    }
  } catch {
    // Fall back to default origin below.
  }

  return DEFAULT_ORIGIN;
};

const buildRedirectUrl = (
  origin: string,
  path: string,
  paymentState: PaymentState,
  planTier: PlanTier,
  source: string,
): string => {
  const url = new URL(path, origin);
  url.searchParams.set("payment", paymentState);
  url.searchParams.set("plan", planTier);
  if (source !== "unknown") {
    url.searchParams.set("checkout_source", source);
  }
  return url.toString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const tier = normalizeTier(body.tier ?? "pro");
    if (!tier) {
      return json(
        {
          error: "Invalid tier. Must be 'plus' or 'pro'.",
          error_code: "invalid_tier",
        },
        400,
      );
    }

    const checkoutSource = normalizeCheckoutSource(body.source);
    const successPath = normalizePath(body.success_path ?? body.successPath, "/dashboard");
    const cancelPath = normalizePath(body.cancel_path ?? body.cancelPath, "/dashboard");
    const origin = resolveOrigin(req.headers.get("origin"));

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json(
        {
          error: "No authorization header provided.",
          error_code: "unauthorized",
        },
        401,
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      return json(
        {
          error: "User not authenticated or email not available.",
          error_code: "unauthorized",
        },
        401,
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

const existingSubscription = subscriptions.data.find((sub: { status: string }) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status),
      );

      if (existingSubscription) {
        let portalUrl: string | null = null;
        try {
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/billing`,
          });
          portalUrl = portalSession.url;
        } catch (portalError) {
          logStep("Unable to create portal session for existing subscriber", {
            customerId,
            portalError: portalError instanceof Error ? portalError.message : String(portalError),
          });
        }

        return json(
          {
            error: "already_subscribed",
            error_code: "already_subscribed",
            message: "Your subscription is already active. Manage billing to update your plan.",
            portal_url: portalUrl,
            subscription_status: existingSubscription.status,
          },
          409,
        );
      }
    }

    const priceId = STRIPE_PRICE_IDS[tier];
    if (!priceId) throw new Error(`Stripe price ID is not configured for ${tier}`);
    const idempotencyBucket = Math.floor(Date.now() / (1000 * 60 * 5));
    const idempotencyKey = `checkout:${user.id}:${tier}:${idempotencyBucket}`;
    logStep("Creating checkout session", { tier, priceId, checkoutSource });

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: buildRedirectUrl(origin, successPath, "success", tier, checkoutSource),
        cancel_url: buildRedirectUrl(origin, cancelPath, "canceled", tier, checkoutSource),
        metadata: {
          user_id: user.id,
          product: "full_access",
          plan_tier: tier,
          checkout_source: checkoutSource,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_tier: tier,
            checkout_source: checkoutSource,
          },
        },
      },
      { idempotencyKey },
    );

    return json({
      url: session.url,
      plan_tier: tier,
      checkout_source: checkoutSource,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Checkout creation failed", { error: errorMessage });
    return json({ error: errorMessage, error_code: "checkout_create_failed" }, 500);
  }
});
