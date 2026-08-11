import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchRepOptions, getCallTargets, saveCallTargets, type CallTargetData } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

function parseType(v: string | null): "日次" | "週次" {
  return v === "週次" ? "週次" : "日次";
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const type = parseType(url.searchParams.get("type"));
    const month = url.searchParams.get("month") || "";
    const [reps, data] = await Promise.all([fetchRepOptions(), getCallTargets(type, month)]);
    return NextResponse.json({ ok: true, reps, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "取得失敗" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const body = await req.json();
    const type = parseType(body.type);
    const month = String(body.month || "");
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, error: "対象月が不正です" }, { status: 400 });
    // 数値のみに正規化
    const byRep: CallTargetData = {};
    for (const [rep, detail] of Object.entries(body.byRep ?? {})) {
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries((detail ?? {}) as Record<string, unknown>)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) clean[k] = n;
      }
      byRep[rep] = clean;
    }
    await saveCallTargets({ type, month, byRep, updatedBy: session.name });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "保存失敗" }, { status: 500 });
  }
}
