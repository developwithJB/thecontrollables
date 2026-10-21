import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);
    if (userError)
      throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email)
      throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { data: binding, error: bindingError } = await supabaseClient
      .from("user_entitlements")
      .select("stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("entitlement_type", "full_access")
      .maybeSingle();
    if (bindingError) throw new Error("billing_binding_unavailable");
    const customerId = binding?.stripe_customer_id;
    if (!customerId) {
      return new Response(
        JSON.stringify({
          error: "no_stripe_customer",
          message:
            "No linked subscription. Contact support if you have an existing subscription.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }
    if (!binding.stripe_subscription_id) throw new Error("subscription_binding_required");
    const subscription=await stripe.subscriptions.retrieve(binding.stripe_subscription_id);
    const boundCustomer=typeof subscription.customer==="string"?subscription.customer:subscription.customer.id;
    if(subscription.metadata?.user_id!==user.id || boundCustomer!==customerId) throw new Error("billing_owner_mismatch");
    const rawOrigin = req.headers.get("origin");
    const origin =
      rawOrigin &&
      [
        "https://thedashboard.agbcoaching.com",
        "http://localhost:5173",
      ].includes(rawOrigin)
        ? rawOrigin
        : "https://thedashboard.agbcoaching.com";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          "The billing portal could not be opened. Please try again or contact support.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
