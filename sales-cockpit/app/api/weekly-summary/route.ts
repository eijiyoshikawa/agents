import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboard, getSummaryCustomers, getContracts, getCalls } from "@/lib/data";
import { notifySlack } from "@/lib/notify";
import { statsForRange, ranges, weeklySlackText } from "@/lib/summary";
import { SLACK_REP } from "@/lib/notify";
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
  const [dash, { customers }, { contracts }, { calls }] = await Promise.all([
    getDashboard(),
    getSummaryCustomers(r.lastMon),
    getContracts(),
    getCalls(),
  ]);
  // Slack通知は対象担当（既定: 江原）の分のみ集計する。
  const monthStart = `${r.today.slice(0, 7)}-01`; // 暦月の月初
  const lastWeek = statsForRange(customers, contracts, calls, r.lastMon, r.lastSun, SLACK_REP);
  const thisWeek = statsForRange(customers, contracts, calls, r.thisMon, r.today, SLACK_REP);
  const monthMtd = statsForRange(customers, contracts, calls, monthStart, r.today, SLACK_REP);
  const text = weeklySlackText(lastWeek, thisWeek, monthMtd, dash, r, SLACK_REP);
  const slack = await notifySlack(text);
  return NextResponse.json({ ok: true, sentToSlack: slack.ok, slack, text });
}
