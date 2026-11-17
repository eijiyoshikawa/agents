import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCustomers } from "@/lib/data";
import { notionClient, notionErrorMessage } from "@/lib/notion";
import { mergeCustomers, planAutoMerges } from "@/lib/dedupe";
import { dbAfterDedupe } from "@/lib/db";
import { sessionOf } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 230_000;

/**
 * 自動でまとめられる重複（会社名が同じ・電話が食い違わない・1件を除いて手つかず）を、時間の許す分だけまとめる。
 * 画面は残りが 0 になるまで繰り返し呼ぶ。skip は「触らなかった」グループ（同じものを何度も試さない）。preview は件数だけ返す
 */
export async function POST(req: Request) {
  const s = await sessionOf();
  if (!s) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  const started = Date.now();
  const body = (await req.json().catch(() => ({}))) as { skip?: string[]; preview?: boolean };
  const skip = new Set(Array.isArray(body.skip) ? body.skip.map(String) : []);
  const { customers, errors } = await getCustomers();
  if (errors.length) return NextResponse.json({ ok: false, error: errors.join(" / ") }, { status: 500 });
  const plans = planAutoMerges(customers, skip);
  if (body.preview) {
    return NextResponse.json({ ok: true, total: plans.length, removable: plans.reduce((n, p) => n + p.removeIds.length, 0), sample: plans.slice(0, 20) });
  }
  const client = notionClient();
  const merged: { name: string; removed: number; copied: string[] }[] = [];
  const skipped: { key: string; name: string; reason: string }[] = [];
  const removedIds: string[] = [];
  for (const p of plans) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      const r = await mergeCustomers(client, p.keepId, p.removeIds, "auto", s.name);
      if (r.skipped) skipped.push({ key: p.key, name: p.name, reason: r.skipped });
      else {
        merged.push({ name: p.name, removed: r.removed.length, copied: r.copied });
        removedIds.push(...r.removed);
      }
    } catch (e) {
      skipped.push({ key: p.key, name: p.name, reason: notionErrorMessage(e) });
      if ((e as { status?: number })?.status === 429) break; // 混み合っているときは一旦やめる
    }
  }
  await dbAfterDedupe({ removedIds }).catch(() => undefined);
  revalidateTag("customers");
  const done = merged.length + skipped.length;
  return NextResponse.json({ ok: true, merged, skipped, removed: removedIds.length, remaining: Math.max(0, plans.length - done) });
}
