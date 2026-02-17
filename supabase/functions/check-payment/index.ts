import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanTier = "plus" | "pro" | "lifetime";

const PRICE_TO_TIER: Record<string, Exclude<PlanTier, "lifetime">> = {
  [Deno.env.get("STRIPE_PRICE_ID_PLUS") ?? "price_1Sty3RIrFORWV7K4lF4DZhPV"]: "plus",
  [Deno.env.get("STRIPE_PRICE_ID_PRO") ?? "price_1Sty37IrFORWV7K43PkIVSJx"]: "pro",
};

const getTierFromPrice = (priceId?: string | null): Exclude<PlanTier, "lifetime"> => {
  if (!priceId) return "plus";
  return PRICE_TO_TIER[priceId] ?? "plus";
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

    const { data: entitlement } = await supabaseClient
      .from("user_entitlements")
      .select("*")
      .eq("user_id", user.id)
      .eq("entitlement_type", "full_access")
      .maybeSingle();

    if (entitlement && (!entitlement.expires_at || new Date(entitlement.expires_at) >= new Date())) {
      const planTier = (entitlement.plan_tier ?? (entitlement.source === "stripe" ? "plus" : "lifetime")) as PlanTier;
      return new Response(JSON.stringify({
        plan_tier: planTier,
        isPaid: true,
        purchasedAt: entitlement.granted_at,
        source: entitlement.source,
        expiresAt: entitlement.expires_at,
        subscriptionStatus: "active",
        message: "Full Access granted",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ plan_tier: null, isPaid: false, message: "No subscription found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const planTier = (subscription.metadata?.plan_tier as Exclude<PlanTier, "lifetime"> | undefined)
        ?? getTierFromPrice(subscription.items.data[0]?.price?.id);

      await supabaseClient.from("user_entitlements").upsert({
        user_id: user.id,
        entitlement_type: "full_access",
        source: "stripe_subscription",
        granted_at: new Date(subscription.start_date * 1000).toISOString(),
        expires_at: currentPeriodEnd,
        stripe_session_id: subscription.id,
        plan_tier: planTier,
      }, { onConflict: "user_id,entitlement_type" });

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

    const allSubscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
    const recentSub = allSubscriptions.data.find((sub: Stripe.Subscription) =>
      sub.status === "past_due" || (sub.status === "canceled" && new Date(sub.current_period_end * 1000) > new Date()),
    );

    if (recentSub) {
      const planTier = (recentSub.metadata?.plan_tier as Exclude<PlanTier, "lifetime"> | undefined)
        ?? getTierFromPrice(recentSub.items.data[0]?.price?.id);

      return new Response(JSON.stringify({
        plan_tier: planTier,
        isPaid: true,
        subscriptionStatus: recentSub.status,
        currentPeriodEnd: new Date(recentSub.current_period_end * 1000).toISOString(),
        purchasedAt: new Date(recentSub.start_date * 1000).toISOString(),
        source: "stripe_subscription",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    return new Response(JSON.stringify({ plan_tier: null, isPaid: false, message: "No subscription found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage, plan_tier: null, isPaid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
