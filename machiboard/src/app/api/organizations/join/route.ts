import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinOrganizationSchema } from "@/lib/validations/organization";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = joinOrganizationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("invite_code", result.data.invite_code)
    .single();

  if (!org) {
    return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "既に参加しています", organization: org });
  }

  const { error } = await supabase
    .from("memberships")
    .insert({ user_id: user.id, organization_id: org.id, role: "member" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ organization: org, joined: true }, { status: 201 });
}
