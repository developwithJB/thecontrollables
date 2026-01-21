import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing configuration (Production)
// Launch price: $29.99 (Feb 1 - March 1, 2025)
// Regular price: $49.99 (after March 1, 2025)
const LAUNCH_PRICE_ID = "price_1Ss8UWIrFORWV7K41FKh4zVY"; // $29.99
const REGULAR_PRICE_ID = "price_1Ss8XUIrFORWV7K4M9uAE2kY"; // $49.99
const LAUNCH_END_DATE = new Date("2025-03-01T00:00:00Z");

// Helper logging function
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Check if user already has a completed payment for Full Access
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 10,
      });
      
      const hasPurchased = sessions.data.some(
        (session: { payment_status: string; mode: string }) => 
          session.payment_status === "paid" && session.mode === "payment"
      );
      
      if (hasPurchased) {
        logStep("User already has Full Access");
        return new Response(JSON.stringify({ 
          error: "You already have Full Access!" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      logStep("No existing customer, will create during checkout");
    }

    // Determine which price to use based on current date
    const now = new Date();
    const isLaunchPeriod = now < LAUNCH_END_DATE;
    const priceId = isLaunchPeriod ? LAUNCH_PRICE_ID : REGULAR_PRICE_ID;
    
    logStep("Price selected", { 
      isLaunchPeriod, 
      priceId,
      launchEndDate: LAUNCH_END_DATE.toISOString()
    });

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://thecontrollables.lovable.app";

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : "always",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=canceled`,
      metadata: {
        user_id: user.id,
        product: "full_access",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
