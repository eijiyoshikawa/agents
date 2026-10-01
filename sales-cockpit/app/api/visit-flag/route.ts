import { NextResponse } from "next/server";
import { updateVisitFlag, notionConfigured, notionErrorMessage } from "@/lib/notion";
import { dbConfigured, dbSetVisitFlag } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 訪問候補チェックの切替。Notion「訪問候補」チェックボックスを正とし、
 * Neonキャッシュにも即時反映する（次回同期を待たずリスト/CSVへ出すため）。
 * 認証は middleware のログインセッションで担保される。
 */
export async function POST(req: Request) {
  if (!notionConfigured()) {
    return NextResponse.json({ ok: false, error: "NOTION_TOKEN が未設定です。" }, { status: 500 });
  }
  let body: { id?: string; flag?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "不正なリクエストです。" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const flag = Boolean(body.flag);
  if (!id) {
    return NextResponse.json({ ok: false, error: "顧客IDが指定されていません。" }, { status: 400 });
  }
  try {
    await updateVisitFlag(id, flag);
  } catch (e) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
  // DB反映はベストエフォート（失敗しても次回同期で追いつく）
  if (dbConfigured()) {
    try {
      await dbSetVisitFlag(id, flag);
    } catch (e) {
      console.error("[visit-flag] db update failed:", (e as Error)?.message);
    }
  }
  return NextResponse.json({ ok: true, flag });
}
