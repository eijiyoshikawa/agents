/**
 * let_hub Cookie の検証（Next.js middleware / Edge 用・依存なし）。
 * 原本は hub/shared/verify-hub-session.edge.ts（sales-cockpit 用のコピー）。
 *
 *   import { verifyHubSession } from "./verify-hub-session.edge";
 *   const hub = await verifyHubSession(req.cookies.get("let_hub")?.value, process.env.HUB_SESSION_SECRET);
 *   if (hub) return NextResponse.next(); // 既存ログインの代わりに通す
 *
 * ペイロードは hub/lib/hub-session.ts と同一形式。
 */
export type HubRole = "staff" | "manager" | "exec";
export type HubSession = { v: 1; email: string; name: string; role: HubRole; iat: number; exp: number };

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
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<HubSession>;
    if (s.v !== 1 || typeof s.email !== "string" || typeof s.exp !== "number" || !ROLES.includes(s.role as HubRole)) return null;
    if (s.exp <= now) return null;
    return s as HubSession;
  } catch {
    return null;
  }
}

export function hasRole(role: HubRole, minRole: HubRole): boolean {
  return RANK[role] >= RANK[minRole];
}
