import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { dbConfigured, syncAll, dbLastSync } from "@/lib/db";
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
    const r = await syncAll();
    revalidateTag("customers-full");
    revalidateTag("contracts");
    return NextResponse.json({ ok: true, configured: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, configured: true, lastSync: await dbLastSync(), error: e?.message ?? "同期失敗" }, { status: 500 });
  }
}
