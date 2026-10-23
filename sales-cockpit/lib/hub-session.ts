/**
 * let_hub Cookie の検証（Next.js middleware / Edge 用・依存なし）。
 * 原本: agents/hub/shared/verify-hub-session.edge.ts（各システムへコピーして使う。変更は原本に入れて配り直す）。
 *
 *   import { verifyHubSession, hubAllows } from "./verify-hub-session.edge";
 *   const hub = await verifyHubSession(req.cookies.get("let_hub")?.value, process.env.HUB_SESSION_SECRET);
 *   if (hub && hubAllows(hub, "<dashboards.json の key>", "staff")) return NextResponse.next();
 *
 * ペイロードは hub/lib/hub-session.ts と同一形式。
 * apps: メンバー管理で「ログインできるサイト」を個別に選んだメンバーだけに入る（key の配列）。
 *       無ければ役割（role）で判定する（従来どおり）。
 */
export type HubRole = "staff" | "manager" | "exec";
export type HubSession = { v: 1; email: string; name: string; role: HubRole; iat: number; exp: number; apps?: string[] };

const ROLES: HubRole[] = ["staff", "manager", "exec"];
const RANK: Record<HubRole, number> = { staff: 0, manager: 1, exec: 2 };
const enc = new TextEncoder();

function b64urlDecode(str: string): Uint8Array {
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function verifyHubSession(
  token: string | null | undefined,
  secret: string | undefined,
  now: number = Math.floor(Date.now() / 1000),
): Promise<HubSession | null> {
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig) as unknown as BufferSource, enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<HubSession>;
    if (s.v !== 1 || typeof s.email !== "string" || typeof s.exp !== "number" || !ROLES.includes(s.role as HubRole)) return null;
    if (s.apps !== undefined && (!Array.isArray(s.apps) || !s.apps.every((a) => typeof a === "string"))) return null;
    if (s.exp <= now) return null;
    return s as HubSession;
  } catch {
    return null;
  }
}

export function hasRole(role: HubRole, minRole: HubRole): boolean {
  return RANK[role] >= RANK[minRole];
}

/**
 * このメンバーが key のサイトにログインできるか。
 * 「ログインできるサイト」を個別に選んだメンバー（apps あり）はその一覧だけで判定し、
 * それ以外（apps なし）は役割が minRole 以上なら通す。
 */
export function hubAllows(s: HubSession, key: string, minRole: HubRole = "staff"): boolean {
  if (Array.isArray(s.apps)) return s.apps.includes(key);
  return hasRole(s.role, minRole);
}
