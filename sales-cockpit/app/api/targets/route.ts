import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveStoredTargets, type StoredTargets } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });

    const body = await req.json();
    const byRep: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.dailyCallsByRep ?? {})) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) byRep[k] = n;
    }
    const t: StoredTargets = {
      workingDaysPerMonth: Number(body.workingDaysPerMonth) || 20,
      monthlyAppointments: Number(body.monthlyAppointments) || 0,
      monthlyContracts: Number(body.monthlyContracts) || 0,
      dailyCallsDefault: Number(body.dailyCallsDefault) || 0,
      dailyCallsByRep: byRep,
      updatedBy: session.name,
    };
    await saveStoredTargets(t);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "保存に失敗しました" }, { status: 500 });
  }
}
