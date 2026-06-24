import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** キャッシュを手動で無効化し、次の表示でNotionから最新を取り直す。 */
export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) {
    return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  }
  for (const tag of ["customers", "customers-full", "calls", "contracts", "targets", "schema"]) {
    revalidateTag(tag);
  }
  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}
