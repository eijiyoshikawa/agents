import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { recordCall } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { notifyAppointment } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });

  try {
    const { customerId, customerName, result, memo } = await req.json();
    if (!customerId || !result) {
      return NextResponse.json({ ok: false, error: "顧客と結果は必須です" }, { status: 400 });
    }
    await recordCall({ customerId, customerName: customerName ?? "", result, memo, repName: session.name });
    revalidateTag("customers");
    revalidateTag("calls");
    if (result === "アポイント獲得") {
      await notifyAppointment({ customerName: customerName ?? "", rep: session.name, memo });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "記録に失敗しました" }, { status: 500 });
  }
}
