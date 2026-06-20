// セッショントークン（HMAC 署名付き）。Edge / Node 双方で動く Web Crypto を使用。
// Cookie に格納し、middleware とサーバコンポーネントで検証する。

export const SESSION_COOKIE = "ps_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12時間

const secret = () => process.env.AUTH_SESSION_SECRET || "dev-insecure-secret-change-me";

export type Session =
  | { role: "staff"; exp: number }
  | { role: "partner"; partnerId: string; slug: string; name: string; exp: number };

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** セッションを発行（exp を付与して署名） */
export async function createSessionToken(
  payload: Omit<Extract<Session, { role: "staff" }>, "exp"> | Omit<Extract<Session, { role: "partner" }>, "exp">
): Promise<string> {
  const full = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const body = b64urlEncode(encoder.encode(JSON.stringify(full)));
  const sig = await sign(body);
  return `${body}.${sig}`;
}

/** トークンを検証して payload を返す（無効なら null） */
export async function verifySessionToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as Session;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
