import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboard, getCustomers, getContracts } from "@/lib/data";
import { notifySlack } from "@/lib/notify";
import { statsForRange, ranges, dailySlackText, addDays } from "@/lib/summary";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 日次サマリ。Vercel Cron（平日 18:15 JST）から呼ばれ、Slackへ投稿する。
 * テスト用クエリ: ?date=YYYY-MM-DD で特定日、?offset=-1 で前日（today基準の日数）。
 * 認証: CRON_SECRET のBearer、またはログイン中のセッションのどちらかでOK。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const isCron = auth === `Bearer ${secret}`;
    if (!isCron) {
      const token = (await cookies()).get(SESSION_COOKIE)?.value;
      if (!(await verifySession(token))) {
        return NextResponse.json({ ok: false, error: "認証が必要です（ログインするか、cronから実行）" }, { status: 401 });
      }
    }
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const offset = Number(url.searchParams.get("offset") ?? "0") || 0;

  const [dash, { customers }, { contracts }] = await Promise.all([getDashboard(), getCustomers(), getContracts()]);
  const r = ranges();
  const target = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : addDays(r.today, offset);
  const stats = statsForRange(customers, contracts, target, target);
  const text = dailySlackText(stats, dash, target);
  await notifySlack(text);
  return NextResponse.json({ ok: true, date: target, sentToSlack: Boolean(process.env.SLACK_WEBHOOK_URL), text });
}
