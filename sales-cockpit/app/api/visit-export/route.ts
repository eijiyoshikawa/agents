import { dbConfigured, dbGetVisitList, parseEmpBand, VISIT_STATUSES } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** CSVフィールドのエスケープ（カンマ・改行・引用符対応） */
function csvField(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 訪問アプローチ用CSVを出力。Google My Maps のインポートを想定
 * （住所列から自動ジオコーディング・「ステータス」列でピン色分け可能）。
 * 認証は middleware のログインセッションで担保される。
 */
export async function GET(req: Request) {
  if (!dbConfigured()) {
    return new Response("DB未設定のため出力できません", { status: 500 });
  }
  const url = new URL(req.url);
  const area = url.searchParams.get("area") ?? "";
  const statusesParam = url.searchParams.get("statuses") ?? "";
  const statuses = statusesParam ? statusesParam.split(",") : [...VISIT_STATUSES].filter((s) => s !== "アプローチ前");
  const noExpOnly = url.searchParams.get("noexp") === "1";
  const emp = parseEmpBand(url.searchParams.get("emp"));
  const visitOnly = url.searchParams.get("visit") === "1";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "500") || 500, 1), 2000);

  let rows;
  try {
    ({ rows } = await dbGetVisitList({ area, statuses, noExpOnly, limit, emp, visitOnly }));
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const msg =
      code === "42703"
        ? "データベースの準備中です（初回同期待ち）。数分後に再度お試しください。"
        : "リストの取得に失敗しました。時間を置いて再度お試しください。";
    return new Response(msg, { status: 500 });
  }

  const header = ["顧客名", "住所", "ステータス", "電話番号", "優先スコア", "従業員数", "未経験可求人", "見込み", "業種", "Notionリンク"];
  const lines = [header.join(",")];
  for (const c of rows) {
    lines.push(
      [
        csvField(c.name),
        csvField(c.address),
        csvField(c.status),
        csvField(c.phone),
        csvField(c.priority),
        csvField(c.employees),
        csvField(c.noExpJob),
        csvField(c.rank),
        csvField(c.industry),
        csvField(c.url),
      ].join(","),
    );
  }
  // UTF-8 BOM: My Maps / Excel での文字化け防止。改行はCRLF。
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  const fname = encodeURIComponent(`訪問リスト_${area || "全エリア"}_${stamp}.csv`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fname}`,
      "Cache-Control": "no-store",
    },
  });
}
