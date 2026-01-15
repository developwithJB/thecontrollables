import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with service role for auth
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user has not purchased");
      return new Response(JSON.stringify({ 
        isPaid: false,
        message: "No purchase found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for completed checkout sessions with payment mode
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });

    // Find any successful payment session for our product
    const successfulPayment = sessions.data.find(
      (session: { payment_status: string; mode: string; metadata?: { product?: string }; id: string; created: number }) => 
        session.payment_status === "paid" && 
        session.mode === "payment" &&
        session.metadata?.product === "full_access"
    );

    if (successfulPayment) {
      logStep("Full Access payment found", { 
        sessionId: successfulPayment.id,
        paidAt: successfulPayment.created 
      });
      
      return new Response(JSON.stringify({ 
        isPaid: true,
        purchasedAt: new Date(successfulPayment.created * 1000).toISOString(),
        message: "Full Access purchased"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Also check for successful payment intents as backup
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 50,
    });

    const successfulIntent = paymentIntents.data.find(
      (intent: { status: string; id: string; created: number }) => intent.status === "succeeded"
    );

    if (successfulIntent) {
      logStep("Successful payment intent found", { 
        intentId: successfulIntent.id 
      });
      
      return new Response(JSON.stringify({ 
        isPaid: true,
        purchasedAt: new Date(successfulIntent.created * 1000).toISOString(),
        message: "Full Access purchased"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("No successful payment found");
    return new Response(JSON.stringify({ 
      isPaid: false,
      message: "No purchase found"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      isPaid: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
