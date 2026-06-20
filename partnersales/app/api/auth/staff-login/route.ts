import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/server";

// スタッフ合言葉は環境変数 STAFF_PASSPHRASE で設定（未設定時は開発用の既定値）。
const STAFF_PASSPHRASE = process.env.STAFF_PASSPHRASE || "staff-demo";

export async function POST(req: Request) {
  const { passphrase } = await req.json().catch(() => ({}));
  if (!passphrase || passphrase !== STAFF_PASSPHRASE) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }
  await setSessionCookie({ role: "staff" });
  return NextResponse.json({ ok: true });
}
