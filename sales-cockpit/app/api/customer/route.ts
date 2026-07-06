import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchCustomerById } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 顧客1件の詳細を取得（一覧の行を開いたとき遅延ロード用）。 */
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) {
    return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  try {
    const customer = await fetchCustomerById(id);
    if (!customer) return NextResponse.json({ ok: false, error: "見つかりません" }, { status: 404 });
    return NextResponse.json({ ok: true, customer });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "取得に失敗しました" }, { status: 500 });
  }
}
