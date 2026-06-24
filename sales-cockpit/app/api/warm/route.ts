import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getDashboard, getContracts, getCustomers, getCalls, getFollowups, getFieldOptions, getAnalytics } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * キャッシュのウォームアップ（Vercel Cron から定期実行）。
 * 各データ取得を先に走らせて unstable_cache を温めておくことで、
 * ユーザーの初回アクセスを高速化する。
 * CRON_SECRET を設定した場合は Authorization: Bearer で認証する。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  const started = Date.now();
  // 重い全件キャッシュは編集では無効化されないため、cronがここで明示的に作り直す（ユーザー表示は常に温かい状態）。
  revalidateTag("customers-full");
  const tasks: Record<string, () => Promise<unknown>> = {
    dashboard: getDashboard,
    customers: getCustomers,
    analytics: getAnalytics,
    contracts: getContracts,
    calls: getCalls,
    followups: getFollowups,
    fieldOptions: getFieldOptions,
  };
  const entries = Object.entries(tasks);
  const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));
  const warmed: Record<string, boolean> = {};
  settled.forEach((r, i) => {
    warmed[entries[i][0]] = r.status === "fulfilled";
  });
  return NextResponse.json({ ok: true, ms: Date.now() - started, warmed });
}
