import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { updateCustomer, notionErrorMessage } from "@/lib/notion";
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
    await updateCustomer(id, fields);
    revalidateTag("customers");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: notionErrorMessage(e) }, { status: 500 });
  }
}
