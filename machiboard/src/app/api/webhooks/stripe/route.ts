import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

const PRICE_TO_TIER: Record<string, string> = {
  machiboard_mini_monthly: "mini",
  machiboard_standard_monthly: "standard",
  machiboard_premium_monthly: "premium",
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organization_id;
      if (!orgId) break;

      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: session.customer as string,
          subscription_status: "active",
        })
        .eq("id", orgId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.lookup_key;
      const tier = priceId ? PRICE_TO_TIER[priceId] ?? "free" : "free";

      await supabase
        .from("organizations")
        .update({
          subscription_tier: tier,
          subscription_status: subscription.status,
        })
        .eq("stripe_customer_id", subscription.customer as string);

      await supabase.from("subscriptions").upsert(
        {
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId ?? null,
          status: subscription.status,
        },
        { onConflict: "stripe_subscription_id" }
      );

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("organizations")
        .update({ subscription_tier: "free", subscription_status: "canceled" })
        .eq("stripe_customer_id", subscription.customer as string);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
