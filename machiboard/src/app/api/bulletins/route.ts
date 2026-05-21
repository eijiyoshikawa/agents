import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBulletinSchema } from "@/lib/validations/bulletin";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  let query = supabase
    .from("bulletins")
    .select("*, author:profiles!bulletins_author_id_fkey(display_name, avatar_url), read_confirmations(user_id)")
    .eq("is_draft", false)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bulletins = (data ?? []).map((b) => ({
    ...b,
    author: Array.isArray(b.author) ? b.author[0] : b.author,
    is_read: Array.isArray(b.read_confirmations)
      ? b.read_confirmations.some((r: { user_id: string }) => r.user_id === user.id)
      : false,
    read_count: Array.isArray(b.read_confirmations) ? b.read_confirmations.length : 0,
    read_confirmations: undefined,
  }));

  return NextResponse.json(bulletins);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = createBulletinSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "管理者権限がありません" }, { status: 403 });
  }

  const { data: bulletin, error } = await supabase
    .from("bulletins")
    .insert({
      organization_id: membership.organization_id,
      author_id: user.id,
      ...result.data,
      is_draft: false,
      published_at: result.data.scheduled_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!result.data.scheduled_at) {
    await dispatchNotifications(supabase, membership.organization_id, bulletin);
  }

  return NextResponse.json(bulletin, { status: 201 });
}
