// 共通セッション Cookie（let_hub）の署名・検証。
// Edge(middleware) と Node の両方で動くよう Web Crypto(subtle) のみを使用する。
// 各ダッシュボード側の検証は shared/verify-hub-session.js（Node / CommonJS）または
// shared/verify-hub-session.edge.ts（Next.js middleware）を使う。ペイロード形式は共通。
import { isRole, type Role } from "./roles";

export const HUB_COOKIE = "let_hub";
export const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export type HubSession = {
  v: 1;
  email: string;
  name: string;
  role: Role;
  iat: number; // 発行時刻 (unix sec)
  exp: number; // 失効時刻 (unix sec)
};

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function getHubSecret(env: NodeJS.ProcessEnv = process.env): string {
  const s = (env.HUB_SESSION_SECRET ?? "").trim();
  if (s) return s;
  if (env.NODE_ENV === "production") {
    throw new Error("HUB_SESSION_SECRET が未設定です（本番では必須）");
  }
  return "let-hub-dev-secret-change-me";
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function ttlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.HUB_SESSION_TTL_SECONDS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TTL_SECONDS;
}

export function buildSession(
  input: { email: string; name: string; role: Role },
  now: number = Math.floor(Date.now() / 1000),
  ttl: number = ttlSeconds(),
): HubSession {
  return { v: 1, email: input.email, name: input.name, role: input.role, iat: now, exp: now + ttl };
}

export async function signHubSession(s: HubSession, secret: string = getHubSecret()): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(s)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

export async function verifyHubSession(
  token: string | null | undefined,
  secret: string = getHubSecret(),
  now: number = Math.floor(Date.now() / 1000),
): Promise<HubSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<HubSession>;
    if (s.v !== 1 || typeof s.email !== "string" || typeof s.exp !== "number" || !isRole(s.role)) return null;
    if (s.exp <= now) return null;
    return s as HubSession;
  } catch {
    return null;
  }
}

/** Set-Cookie 用の属性。HUB_COOKIE_DOMAIN が設定されていれば親ドメインに共有する。 */
export function hubCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  const domain = (env.HUB_COOKIE_DOMAIN ?? "").trim();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}
