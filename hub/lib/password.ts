// パスワードのハッシュ化・検証（scrypt / node:crypto）。Node ランタイム専用。
// 形式: scrypt$<N>$<salt b64>$<hash b64>
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!password || !stored) return false;
  const [algo, nStr, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !nStr || !saltB64 || !hashB64) return false;
  const n = Number(nStr);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    const expected = Buffer.from(hashB64, "base64");
    const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, { N: n });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * HUB_PASSWORD_HASHES（JSON オブジェクト: メール → ハッシュ）を読み取る。
 * 不正な JSON は空として扱う（ログインは全員失敗する）。
 */
export function loadPasswordHashes(raw: string | undefined = process.env.HUB_PASSWORD_HASHES): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k.trim().toLowerCase()] = v;
    }
    return out;
  } catch {
    return {};
  }
}
