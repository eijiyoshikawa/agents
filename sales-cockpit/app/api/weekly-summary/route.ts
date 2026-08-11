import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboard, getSummaryCustomers, getContracts, getCalls } from "@/lib/data";
import { backfillAppointmentDates } from "@/lib/notion";
import { notifySlack } from "@/lib/notify";
import { statsForRange, ranges, weeklySlackText, patchAppointments } from "@/lib/summary";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 週次サマリ。Vercel Cron（毎週月曜 08:00 JST）から呼ばれ、Slackへ投稿する。
 * 認証: CRON_SECRET のBearer、またはログイン中のセッションのどちらかでOK（ブラウザ手動テスト可）。
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

  const r = ranges();
  // Notionで直接「アポイント獲得」にした顧客の取得日を送信直前に補完（手入力の取りこぼし対策）
  const backfilled = await backfillAppointmentDates().catch(() => [] as { id: string; date: string }[]);
  const [dash, { customers: rawCustomers }, { contracts }, { calls }] = await Promise.all([
    getDashboard(),
    getSummaryCustomers(r.lastMon),
    getContracts(),
    getCalls(),
  ]);
  const customers = patchAppointments(rawCustomers, backfilled);
  // Slack通知は全担当分を集計し、担当別内訳を含める（非稼働メンバーは集計側で除外）。
  const monthStart = `${r.today.slice(0, 7)}-01`; // 暦月の月初
  const lastWeek = statsForRange(customers, contracts, calls, r.lastMon, r.lastSun);
  const thisWeek = statsForRange(customers, contracts, calls, r.thisMon, r.today);
  const monthMtd = statsForRange(customers, contracts, calls, monthStart, r.today);
  const text = weeklySlackText(lastWeek, thisWeek, monthMtd, dash, r);
  const slack = await notifySlack(text);
  return NextResponse.json({ ok: true, sentToSlack: slack.ok, slack, text });
}
