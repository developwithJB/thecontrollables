import { LEGACY_SUBSCRIPTION_PRICES, subscriptionPeriod, subscriptionTier, entitlementIsCurrent, isLegacyAppGrant } from "../_shared/stripeSubscription.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanTier = "plus" | "pro" | "premium" | "lifetime";

const PRICE_TO_TIER = (): Record<string, Exclude<PlanTier, "lifetime">> => {
  const map: Record<string, Exclude<PlanTier, "lifetime">> = {...LEGACY_SUBSCRIPTION_PRICES};
  const plus = Deno.env.get("STRIPE_PRICE_ID_PLUS");
  const pro = Deno.env.get("STRIPE_PRICE_ID_PRO");
  const premium = Deno.env.get("STRIPE_PRICE_ID_PREMIUM");
  if (plus) map[plus] = "plus";
  if (pro) map[pro] = "pro"; // Legacy $9.99/month subscribers retain their plan.
  for (const name of ["STRIPE_PRICE_ID_PRO_ANNUAL", "STRIPE_PRICE_ID_PRO_MONTHLY"]) {
    const id = Deno.env.get(name);
    if (id) map[id] = "pro";
  }
  if (premium) map[premium] = "premium";
  return map;
};

const getTierFromPrice = (priceId?: string | null): Exclude<PlanTier, "lifetime"> => {
  return subscriptionTier(priceId ?? undefined, PRICE_TO_TIER());
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { data: entitlement, error: entitlementError } = await supabaseClient
      .from("user_entitlements")
      .select("*")
      .eq("user_id", user.id)
      .eq("entitlement_type", "full_access")
      .maybeSingle();

    if (entitlementError) throw new Error("entitlement_lookup_failed");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;
    if (entitlement && entitlementIsCurrent(entitlement)) {
      if(entitlement.source==="stripe_subscription"){
        if(!stripe || !entitlement.stripe_subscription_id)throw new Error("subscription_binding_required");
        const live=await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id);
        const customer=typeof live.customer==="string"?live.customer:live.customer.id;
        if(live.metadata?.user_id!==user.id || customer!==entitlement.stripe_customer_id || !["active","trialing"].includes(live.status))throw new Error("subscription_owner_mismatch");
        getTierFromPrice(live.items.data[0]?.price?.id);
      }
      const legacyAppAccess = isLegacyAppGrant(entitlement);
      // Preserve historical app feature access without claiming a subscription
      // or changing the separate authoritative hosted-AI allowance.
      const planTier = (entitlement.plan_tier ?? (entitlement.source === "manual" ? "lifetime" : "pro")) as PlanTier;
      return new Response(JSON.stringify({
        plan_tier: planTier,
        isPaid: true,
        legacyAppAccess,
        purchasedAt: entitlement.granted_at,
        source: entitlement.source,
        expiresAt: entitlement.expires_at,
        subscriptionStatus: legacyAppAccess ? null : entitlement.subscription_status || "active",
        currentPeriodEnd: entitlement.current_period_end || entitlement.expires_at,
        message: "Full Access granted",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");

    const customerId = entitlement?.stripe_customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ plan_tier: null, isPaid: false, message: "No subscription found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      if (subscription.metadata?.user_id !== user.id) throw new Error("subscription_owner_mismatch");
      const currentPeriodEnd = new Date(subscriptionPeriod(subscription).end * 1000).toISOString();
      const planTier = getTierFromPrice(subscription.items.data[0]?.price?.id);

      await supabaseClient.from("user_entitlements").upsert({
        user_id: user.id,
        entitlement_type: "full_access",
        source: "stripe_subscription",
        granted_at: new Date(subscription.start_date * 1000).toISOString(),
        expires_at: currentPeriodEnd,
        stripe_session_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        current_period_start: new Date(subscriptionPeriod(subscription).start * 1000).toISOString(),
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        price_id: subscription.items.data[0]?.price?.id ?? null,
        plan_tier: planTier,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,entitlement_type" });

      await supabaseClient.from("profiles").update({ plan_tier: planTier }).eq("id", user.id);

      return new Response(JSON.stringify({
        plan_tier: planTier,
        isPaid: true,
        subscriptionStatus: subscription.status,
        currentPeriodEnd,
        purchasedAt: new Date(subscription.start_date * 1000).toISOString(),
        source: "stripe_subscription",
        message: "Active subscription",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    return new Response(JSON.stringify({ plan_tier: null, isPaid: false, message: "No subscription found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Billing status could not be verified. Please try again.", plan_tier: null, isPaid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
