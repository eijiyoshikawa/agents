import { NextResponse } from "next/server";
import { getDashboard, getCustomers, getContracts } from "@/lib/data";
import { notifySlack } from "@/lib/notify";
import { statsForRange, ranges, dailySlackText } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 日次サマリ。Vercel Cron（平日 18:15 JST）から呼ばれ、Slackへ投稿する。 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const [dash, { customers }, { contracts }] = await Promise.all([getDashboard(), getCustomers(), getContracts()]);
  const r = ranges();
  const today = statsForRange(customers, contracts, r.today, r.today);
  const text = dailySlackText(today, dash, r.today);
  await notifySlack(text);
  return NextResponse.json({ ok: true, sentToSlack: Boolean(process.env.SLACK_WEBHOOK_URL), text });
}
