import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lookup_key, organization_id } = await request.json();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organization_id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "管理者権限がありません" }, { status: 403 });
  }

  const stripe = getStripe();

  const prices = await stripe.prices.list({ lookup_keys: [lookup_key], limit: 1 });
  if (prices.data.length === 0) {
    return NextResponse.json({ error: "プランが見つかりません" }, { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id, name")
    .eq("id", organization_id)
    .single();

  let customerId = org?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name,
      metadata: { organization_id },
    });
    customerId = customer.id;
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", organization_id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: prices.data[0].id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription?canceled=true`,
    metadata: { organization_id },
    payment_method_types: ["card"],
    locale: "ja",
  });

  return NextResponse.json({ url: session.url });
}
