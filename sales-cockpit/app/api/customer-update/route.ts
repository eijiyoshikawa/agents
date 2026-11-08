import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { updateCustomer, notionErrorMessage, customerStatusOf, syncContractsForCustomer } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { id, fields } = await req.json();
    if (!id || typeof fields !== "object") {
      return NextResponse.json({ ok: false, error: "id と fields が必要です" }, { status: 400 });
    }
    const statusChanged = typeof fields["ステータス"] === "string";
    const prev = statusChanged ? await customerStatusOf(id) : null;
    await updateCustomer(id, fields);
    revalidateTag("customers");
    // 顧客ステータスの変更を 契約管理DB（MRR の元）にも反映（案件KPI・担当マッピングはそこから追従）
    let contracts = 0;
    if (statusChanged) {
      contracts = await syncContractsForCustomer(id, prev, String(fields["ステータス"]).trim()).catch(() => 0);
      if (contracts) revalidateTag("contracts");
    }
    return NextResponse.json({ ok: true, contracts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
