import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with service role key and user token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      priceId,
      totalAmount,
      subscriptionAmount,
      topupAmount,
      couponId,
      discountAmount,
    } = await req.json();

    if (!priceId || !totalAmount) {
      throw new Error("Missing required parameters");
    }

    // Get or create Stripe customer
    let customerId: string;
    const { data: existingSubscription } = await supabaseClient
      .from("subscriptions")
      .select("customer_id")
      .eq("user_id", user.id)
      .not("customer_id", "is", null)
      .limit(1)
      .single();

    if (existingSubscription?.customer_id) {
      customerId = existingSubscription.customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create subscription payment intent
    let subscriptionClientSecret: string | null = null;
    let topupClientSecret: string | null = null;

    if (subscriptionAmount > 0) {
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          user_id: user.id,
          coupon_id: couponId || "",
          discount_amount: discountAmount?.toString() || "0",
        },
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      if (paymentIntent && paymentIntent.client_secret) {
        subscriptionClientSecret = paymentIntent.client_secret;
      }

      // Store subscription in database
      console.log("Storing subscription in database:", {
        user_id: user.id,
        stripe_id: subscription.id,
        status: subscription.status,
      });

      const { data: insertedSub, error: insertError } = await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          stripe_id: subscription.id,
          price_id: priceId,
          stripe_price_id: priceId,
          currency: subscription.currency || "usd",
          interval: subscription.items?.data[0]?.price?.recurring?.interval || "month",
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          amount: Math.round(subscriptionAmount * 100),
          started_at: subscription.start_date || subscription.created,
          customer_id: customerId,
          metadata: {
            coupon_id: couponId,
            discount_amount: discountAmount,
            user_email: user.email,
          },
        }, {
          onConflict: "stripe_id",
        })
        .select();

      if (insertError) {
        console.error("Error storing subscription:", insertError);
        throw new Error(`Failed to store subscription: ${insertError.message}`);
      }

      console.log("Subscription stored successfully:", insertedSub);
    }

    // Create top-up payment intent if needed
    if (topupAmount > 0) {
      const topupPaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(topupAmount * 100),
        currency: "usd",
        customer: customerId,
        metadata: {
          user_id: user.id,
          type: "topup",
        },
      });

      topupClientSecret = topupPaymentIntent.client_secret;
    }

    return new Response(
      JSON.stringify({
        clientSecret: subscriptionClientSecret,
        topupClientSecret: topupClientSecret,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to create subscription",
        details: error.toString(),
        type: error.name
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
