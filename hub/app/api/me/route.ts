// 自分のハブセッション情報（デバッグ・各アプリとの疎通確認用）
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dashboardsForRole } from "@/lib/dashboards";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  const { email, name, role } = session.user;
  return NextResponse.json({ ok: true, user: { email, name, role }, dashboards: dashboardsForRole(role).map((d) => d.key) });
}
