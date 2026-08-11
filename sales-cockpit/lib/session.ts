// セッション署名・検証。Edge(middleware)とNodeの両方で動くよう Web Crypto(subtle) を使用。
// パスワードのハッシュ化は node:crypto を使う lib/auth.ts 側で行う（こちらは署名のみ）。

const SECRET = process.env.SESSION_SECRET || process.env.NOTION_TOKEN || "sales-cockpit-dev-secret-change-me";
const enc = new TextEncoder();

export const SESSION_COOKIE = "sc_session";
export type Session = { uid: string; name: string; iat: number };

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
async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(s: Session): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(s)));
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(payload));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
  } catch {
    return null;
  }
}
