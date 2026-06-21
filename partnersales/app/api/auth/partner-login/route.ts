import { NextResponse } from "next/server";
import { getServerClient, hasServerSupabase } from "@/lib/db/supabase";
import { setSessionCookie } from "@/lib/auth/server";

export async function POST(req: Request) {
  if (!hasServerSupabase()) {
    return NextResponse.json({ error: "Supabase 未設定です（docs/RUNBOOK.md 参照）" }, { status: 503 });
  }
  const { loginId, password } = await req.json().catch(() => ({}));
  if (!loginId || !password) {
    return NextResponse.json({ error: "ログインID とパスワードを入力してください" }, { status: 400 });
  }

  const sb = getServerClient();
  const { data, error } = await sb.rpc("partner_login", { p_login_id: loginId, p_password: password });
  if (error) {
    // ロック中はその旨を伝える（それ以外は汎用メッセージで詳細を伏せる）
    const locked = error.message?.includes("ロック");
    return NextResponse.json(
      { error: locked ? error.message : "ログインに失敗しました" },
      { status: locked ? 429 : 401 }
    );
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.slug) {
    return NextResponse.json({ error: "ログインに失敗しました" }, { status: 401 });
  }

  await setSessionCookie({ role: "partner", partnerId: row.partner_id, slug: row.slug, name: row.name });
  return NextResponse.json({ slug: row.slug });
}
