import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { updateCustomerConfirm, notionErrorMessage } from "@/lib/notion";
import { dbAfterDedupe } from "@/lib/db";
import { sessionOf } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 「別会社（重複ではない）」: グループ全員の確認状況を OK にし、重複候補から外す */
export async function POST(req: Request) {
  const s = await sessionOf();
  if (!s) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    const list = (ids ?? []).map(String).filter(Boolean).slice(0, 50);
    if (list.length === 0) return NextResponse.json({ ok: false, error: "対象がありません" }, { status: 400 });
    for (const id of list) await updateCustomerConfirm(id, "OK");
    await dbAfterDedupe({ confirmOk: list }).catch(() => undefined);
    revalidateTag("customers");
    return NextResponse.json({ ok: true, count: list.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
