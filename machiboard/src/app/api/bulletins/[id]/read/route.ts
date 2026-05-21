import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("read_confirmations")
    .upsert(
      { bulletin_id: id, user_id: user.id },
      { onConflict: "bulletin_id,user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ confirmed: true });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: bulletin } = await supabase
    .from("bulletins")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!bulletin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", bulletin.organization_id)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (membership.role === "admin") {
    const { data: confirmations } = await supabase
      .from("read_confirmations")
      .select("*, profile:profiles(display_name)")
      .eq("bulletin_id", id);

    const { count: memberCount } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", bulletin.organization_id);

    return NextResponse.json({
      confirmations: confirmations ?? [],
      member_count: memberCount ?? 0,
      read_count: confirmations?.length ?? 0,
    });
  }

  const { data: ownConfirmation } = await supabase
    .from("read_confirmations")
    .select("read_at")
    .eq("bulletin_id", id)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ is_read: !!ownConfirmation, read_at: ownConfirmation?.read_at });
}
