import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { updateCustomerConfirm } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { id, value } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
    await updateCustomerConfirm(id, value || "重複（統合/既存に追記）");
    revalidateTag("customers");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "更新失敗" }, { status: 500 });
  }
}
