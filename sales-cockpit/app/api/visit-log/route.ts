import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { recordVisit, notionErrorMessage, CUSTOMER_STATUS_OPTIONS } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 訪問結果の記録（スマホの訪問記録ページから）。ステータス更新・メモ追記のいずれか必須。 */
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { id, status, memo } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
    }
    const st = typeof status === "string" && status ? status : undefined;
    const mm = typeof memo === "string" && memo.trim() ? memo.trim() : undefined;
    if (st && !CUSTOMER_STATUS_OPTIONS.has(st)) {
      return NextResponse.json({ ok: false, error: "不正なステータスです" }, { status: 400 });
    }
    if (!st && !mm) {
      return NextResponse.json({ ok: false, error: "ステータスかメモのどちらかを入力してください" }, { status: 400 });
    }
    await recordVisit({ customerId: id, status: st, memo: mm });
    revalidateTag("customers");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
