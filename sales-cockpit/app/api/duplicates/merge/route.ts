import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { notionClient, notionErrorMessage } from "@/lib/notion";
import { mergeCustomers } from "@/lib/dedupe";
import { dbAfterDedupe } from "@/lib/db";
import { sessionOf } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 人が選んで「1つにまとめる」: keepId を残し、removeIds の項目・紐付け・メモを写してゴミ箱へ */
export async function POST(req: Request) {
  const s = await sessionOf();
  if (!s) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { keepId, removeIds } = (await req.json()) as { keepId?: string; removeIds?: string[] };
    const ids = (removeIds ?? []).map(String).filter((id) => id && id !== keepId);
    if (!keepId || ids.length === 0) return NextResponse.json({ ok: false, error: "残す会社と、まとめる会社を選んでください" }, { status: 400 });
    const r = await mergeCustomers(notionClient(), String(keepId), ids, "manual", s.name);
    if (r.skipped) return NextResponse.json({ ok: false, error: r.skipped }, { status: 409 });
    await dbAfterDedupe({ removedIds: r.removed }).catch(() => undefined);
    revalidateTag("customers");
    return NextResponse.json({ ok: true, removed: r.removed.length, copied: r.copied });
  } catch (e) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
