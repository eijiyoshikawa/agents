import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { dbConfigured, syncAll, dbLastSync } from "@/lib/db";
import { backfillAppointmentDates } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Notion → Postgres(Neon) 全件同期。Vercel Cron（既定10分毎）から実行。
 * 重いNotion取得はここだけで行い、各ページはDBから高速に読む。
 * DB未設定なら何もしない（NotionキャッシュのままでOK）。
 * 認証: CRON_SECRET のBearer、またはログイン中セッション（手動実行用）。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      const token = (await cookies()).get(SESSION_COOKIE)?.value;
      if (!(await verifySession(token))) {
        return NextResponse.json({ ok: false, error: "認証が必要です（ログインまたはcron）" }, { status: 401 });
      }
    }
  }
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "DB未設定（DATABASE_URL/POSTGRES_URL）。NotionキャッシュのままでOKです。" });
  }
  try {
    // Notion直接入力のアポ（取得日が空）を先に補完してから同期する。
    // これでこの回の同期にアポ取得日が乗り、集計・通知に反映される。
    const backfilled = await backfillAppointmentDates().catch((e) => {
      console.error("アポ取得日バックフィル失敗:", e?.message);
      return [] as { id: string; date: string }[];
    });
    // 既定は増分同期（前回以降の更新分のみ）。?mode=full で全件同期を強制。
    const url = new URL(req.url);
    const r = await syncAll({ mode: url.searchParams.get("mode") === "full" ? "full" : "incremental" });
    revalidateTag("customers-full");
    revalidateTag("contracts");
    if (backfilled.length > 0) revalidateTag("customers");
    return NextResponse.json({ ok: true, configured: true, appointment_backfilled: backfilled.length, ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, configured: true, lastSync: await dbLastSync(), error: e?.message ?? "同期失敗" }, { status: 500 });
  }
}
