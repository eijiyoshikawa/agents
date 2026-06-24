import { NextResponse } from "next/server";
import { getDashboard, getCustomers, getContracts } from "@/lib/data";
import { notifySlack } from "@/lib/notify";
import { statsForRange, ranges, weeklySlackText } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 週次サマリ。Vercel Cron（毎週月曜 08:00 JST）から呼ばれ、Slackへ投稿する。 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const [dash, { customers }, { contracts }] = await Promise.all([getDashboard(), getCustomers(), getContracts()]);
  const r = ranges();
  const lastWeek = statsForRange(customers, contracts, r.lastMon, r.lastSun);
  const thisWeek = statsForRange(customers, contracts, r.thisMon, r.today);
  const text = weeklySlackText(lastWeek, thisWeek, dash, r);
  await notifySlack(text);
  return NextResponse.json({ ok: true, sentToSlack: Boolean(process.env.SLACK_WEBHOOK_URL), text });
}
