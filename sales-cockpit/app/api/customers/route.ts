import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { searchCustomers } from "@/lib/data";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import type { SearchParams } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 架電リストのサーバー側検索（1ページ分を返す）。 */
export async function GET(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const params: SearchParams = {
    q: sp.get("q") ?? "",
    rep: sp.get("rep") ?? "",
    status: sp.get("status") ?? "",
    rank: sp.get("rank") ?? "",
    industry: sp.get("industry") ?? "",
    agencyMode: (sp.get("agencyMode") as SearchParams["agencyMode"]) ?? "all",
    dupOnly: sp.get("dupOnly") === "1",
    sort: sp.get("sort") ?? "lastCallDate",
    dir: (sp.get("dir") as "asc" | "desc") ?? "desc",
    page: Number(sp.get("page") ?? "1") || 1,
    pageSize: Number(sp.get("pageSize") ?? "50") || 50,
  };
  const { result, errors } = await searchCustomers(params);
  return NextResponse.json({ ok: true, ...result, errors });
}
