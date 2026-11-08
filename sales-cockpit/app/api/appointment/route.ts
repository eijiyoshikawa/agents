import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { createAppointment, recordAppointmentOutcome, setAppointmentSchedule, notionErrorMessage, APPOINTMENT_OUTCOMES, type AppointmentOutcome } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 📅 アポ管理の記録（日次ボード・顧客ページから）
 *   action=schedule : { id, scheduledAt }                    実施予定日時を入れる
 *   action=create   : { customerId, customerName, scheduledAt, obtainedOn? }  アポ管理に無いアポを登録
 *   action=outcome  : { id, outcome, newDate?, memo? }      結果（実施／リスケ／キャンセル／先方不在）
 */
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const b = await req.json();
    if (b.action === "schedule") {
      if (!b.id || !b.scheduledAt) return NextResponse.json({ ok: false, error: "実施予定日時を入れてください" }, { status: 400 });
      await setAppointmentSchedule(b.id, b.scheduledAt);
    } else if (b.action === "create") {
      if (!b.customerId || !b.scheduledAt) return NextResponse.json({ ok: false, error: "実施予定日時を入れてください" }, { status: 400 });
      await createAppointment({ customerId: b.customerId, customerName: b.customerName ?? "", rep: b.rep ?? session.name, scheduledAt: b.scheduledAt, obtainedOn: b.obtainedOn });
    } else if (b.action === "outcome") {
      if (!b.id || !APPOINTMENT_OUTCOMES.includes(b.outcome)) return NextResponse.json({ ok: false, error: "結果を選んでください" }, { status: 400 });
      await recordAppointmentOutcome({ id: b.id, outcome: b.outcome as AppointmentOutcome, newDate: b.newDate, memo: b.memo, repName: session.name });
      if (b.outcome === "実施") revalidateTag("customers");
    } else {
      return NextResponse.json({ ok: false, error: "不明な操作です" }, { status: 400 });
    }
    revalidateTag("appointments");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
