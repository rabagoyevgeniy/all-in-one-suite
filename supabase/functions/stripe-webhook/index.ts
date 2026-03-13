import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      // Record payment in financial_transactions
      const { error: txError } = await supabase.from("financial_transactions").insert({
        payer_id: userId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "AED",
        direction: "income",
        type: "payment",
        description: `Stripe payment ${session.id}`,
        stripe_session_id: session.id,
        payment_method: "stripe",
        status: "completed",
      });

      if (txError) {
        console.error("[stripe-webhook] Error inserting transaction:", txError);
      } else {
        console.log("[stripe-webhook] Transaction recorded for user:", userId);
      }

      // If subscription mode, update subscriptions table
      if (session.mode === "subscription" && session.subscription) {
        const { error: subError } = await supabase.from("subscriptions").update({
          stripe_subscription_id: String(session.subscription),
          status: "active",
        }).eq("parent_id", userId);

        if (subError) {
          console.error("[stripe-webhook] Error updating subscription:", subError);
        } else {
          console.log("[stripe-webhook] Subscription updated for user:", userId);
        }
      }
    } else {
      console.warn("[stripe-webhook] No userId in session metadata");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("[stripe-webhook] Error cancelling subscription:", error);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription;
    if (subscriptionId) {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", String(subscriptionId));

      if (error) {
        console.error("[stripe-webhook] Error marking subscription past_due:", error);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
