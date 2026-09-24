import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchJobScanTargets, updateJobFlag, notionErrorMessage } from "@/lib/notion";
import { judgeNoExperience } from "@/lib/jobscan";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FETCH_TIMEOUT_MS = 8000;
const CONCURRENCY = 8;
const MAX_HTML_CHARS = 500_000;

/** 採用ページを1件取得して未経験可を判定。取得失敗は「不明」。 */
async function scanOne(url: string): Promise<"あり" | "なし" | "不明"> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SalesCockpitBot/1.0; +https://salescockpit-let.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "不明";
    const html = (await res.text()).slice(0, MAX_HTML_CHARS);
    return judgeNoExperience(html);
  } catch {
    return "不明";
  }
}

/**
 * 未経験可求人スキャン。採用ページURLが登録済みで未判定の顧客を巡回し、
 * 「未経験歓迎/経験不問」等の記載有無を判定して Notion にフラグを書き込む。
 * Vercel Cron（30分毎）で対象が無くなるまで自動消化。手動実行も可（ログイン or CRON_SECRET）。
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

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "60") || 60, 1), 120);

  try {
    const targets = await fetchJobScanTargets(limit);
    if (targets.length === 0) {
      return NextResponse.json({ ok: true, scanned: 0, done: true, message: "スキャン対象なし（全件判定済み）" });
    }

    let hit = 0;
    let none = 0;
    let unknown = 0;
    // CONCURRENCY 件ずつ並列で取得・判定・書き込み（Notion APIレート制限にも収まる粒度）
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (t) => {
          const verdict = await scanOne(t.url);
          if (verdict === "あり") hit++;
          else if (verdict === "なし") none++;
          else unknown++;
          try {
            await updateJobFlag(t.id, verdict);
          } catch (e) {
            console.error("[job-scan] flag write failed:", t.name, (e as Error)?.message);
          }
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      scanned: targets.length,
      hit,
      none,
      unknown,
      done: targets.length < limit, // limit未満＝残り対象が尽きた
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
