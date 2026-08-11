import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DB, fetchCustomers, fetchCustomersSlim } from "@/lib/notion";
import { dbConfigured } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 取得件数の切り分け診断（ログイン必須）。raw=filter_properties無し / slim=有り。 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  const [raw, slim] = await Promise.all([
    fetchCustomers().then((r) => r.length).catch((e) => `ERR:${e?.message ?? e}`),
    fetchCustomersSlim().then((r) => r.length).catch((e) => `ERR:${e?.message ?? e}`),
  ]);
  return NextResponse.json({
    ok: true,
    dbId: DB.customers,
    rawCount: raw, // filter_properties 無し
    slimCount: slim, // filter_properties 有り（本番経路）
    postgresConfigured: dbConfigured(),
  });
}
