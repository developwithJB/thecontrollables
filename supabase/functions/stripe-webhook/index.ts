import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type PlanTier = "plus" | "pro" | "premium";

const PRICE_TO_TIER = (): Record<string, PlanTier> => {
  const map: Record<string, PlanTier> = {};
  const plus = Deno.env.get("STRIPE_PRICE_ID_PLUS");
  const pro = Deno.env.get("STRIPE_PRICE_ID_PRO");
  const premium = Deno.env.get("STRIPE_PRICE_ID_PREMIUM");
  if (plus) map[plus] = "plus";
  if (pro) map[pro] = "pro";
  if (premium) map[premium] = "premium";
  return map;
};

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getSupabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

const getPlanTier = (subscription: Stripe.Subscription): PlanTier => {
  const metadataTier = subscription.metadata?.plan_tier;
  if (metadataTier === "plus" || metadataTier === "pro" || metadataTier === "premium") return metadataTier;

  const priceId = subscription.items.data[0]?.price?.id;
  return (priceId && PRICE_TO_TIER()[priceId]) || "pro";
};

const getUserIdFromSubscription = async (
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<string | null> => {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;

  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    subscription: subscription.id,
    limit: 1,
  });

  return sessions.data[0]?.client_reference_id || sessions.data[0]?.metadata?.user_id || null;
};

const upsertSubscriptionEntitlement = async (
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  subscription: Stripe.Subscription,
) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const planTier = getPlanTier(subscription);
  const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const isDeleted = subscription.status === "canceled" || subscription.status === "incomplete_expired";
  const now = new Date().toISOString();

  await admin.from("user_entitlements").upsert({
    user_id: userId,
    entitlement_type: "full_access",
    source: "stripe_subscription",
    granted_at: currentPeriodStart,
    expires_at: currentPeriodEnd,
    stripe_session_id: subscription.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    price_id: subscription.items.data[0]?.price?.id ?? null,
    plan_tier: planTier,
    updated_at: now,
  }, { onConflict: "user_id,entitlement_type" });

  await admin
    .from("profiles")
    .update({ plan_tier: isDeleted ? "free" : planTier, updated_at: now })
    .eq("id", userId);
};

const handleCheckoutCompleted = async (
  stripe: Stripe,
  admin: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
) => {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!userId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionEntitlement(admin, userId, subscription);
};

const handleSubscriptionChanged = async (
  stripe: Stripe,
  admin: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
) => {
  const userId = await getUserIdFromSubscription(stripe, subscription);
  if (!userId) {
    console.warn("[stripe-webhook] Missing user_id for subscription", subscription.id);
    return;
  }

  await upsertSubscriptionEntitlement(admin, userId, subscription);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return json({ error: "Stripe webhook is not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing Stripe signature" }, 400);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return json({ error: message }, 400);
  }

  const admin = getSupabaseAdmin();
  const { data: existingEvent } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEvent) return json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChanged(stripe, admin, event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    await admin.from("stripe_webhook_events").insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

    return json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] processing failed", error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500);
  }
});
