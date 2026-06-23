import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { updateCustomerMemo } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, memo } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
    }
    await updateCustomerMemo(id, typeof memo === "string" ? memo : "");
    revalidateTag("customers");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Notion更新権限が無い場合などはここで握る
    return NextResponse.json({ ok: false, error: e?.message ?? "保存に失敗しました" }, { status: 500 });
  }
}
