import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listSavedLists, createSavedList, deleteSavedList, type ListFilters } from "@/lib/notion";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, lists: await listSavedLists() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "取得失敗" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "リスト名を入力してください" }, { status: 400 });
    const f = body.filters ?? {};
    const filters: ListFilters = {
      q: f.q || undefined,
      rep: f.rep || undefined,
      status: f.status || undefined,
      rank: f.rank || undefined,
      industry: f.industry || undefined,
    };
    await createSavedList({ name, creator: session.name, filters, count: Number(body.count) || 0 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "保存失敗" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireSession())) return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  try {
    const { pageId } = await req.json();
    if (!pageId) return NextResponse.json({ ok: false, error: "pageId が必要です" }, { status: 400 });
    await deleteSavedList(pageId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "削除失敗" }, { status: 500 });
  }
}
