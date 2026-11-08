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
    const { customerId, customerName, result, memo, product, scheduledAt } = await req.json();
    if (result === "アポイント獲得" && !scheduledAt) {
      return NextResponse.json({ ok: false, error: "アポの実施予定日時を入れてください" }, { status: 400 });
    }
    if (!customerId || !result) {
      return NextResponse.json({ ok: false, error: "顧客と結果は必須です" }, { status: 400 });
    }
    await recordCall({ customerId, customerName: customerName ?? "", result, memo, repName: session.name, product, scheduledAt });
    if (result === "アポイント獲得") revalidateTag("appointments");
    revalidateTag("customers");
    revalidateTag("calls");
    revalidateTag("contracts"); // 顧客ステータスの変更で契約管理DB も変わることがある
    if (result === "アポイント獲得") {
      await notifyAppointment({ customerName: customerName ?? "", rep: session.name, memo });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "記録に失敗しました" }, { status: 500 });
  }
}
