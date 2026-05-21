import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchReminder } from "@/lib/notifications/dispatcher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: bulletin } = await supabase
    .from("bulletins")
    .select("organization_id, title")
    .eq("id", id)
    .single();

  if (!bulletin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", bulletin.organization_id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "管理者権限がありません" }, { status: 403 });
  }

  const { data: readUserIds } = await supabase
    .from("read_confirmations")
    .select("user_id")
    .eq("bulletin_id", id);

  const readSet = new Set((readUserIds ?? []).map((r) => r.user_id));

  const { data: allMembers } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", bulletin.organization_id);

  const unreadUserIds = (allMembers ?? [])
    .map((m) => m.user_id)
    .filter((uid) => !readSet.has(uid));

  if (unreadUserIds.length === 0) {
    return NextResponse.json({ message: "全員が既読です", reminded: 0 });
  }

  await dispatchReminder(supabase, unreadUserIds, bulletin.title, id);

  return NextResponse.json({ reminded: unreadUserIds.length });
}
