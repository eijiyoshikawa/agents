import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// パスワードは scrypt でハッシュ化して保存（平文は保存しない）。形式: "<saltHex>:<hashHex>"
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = (stored || "").split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** 組織の参加コード（新規登録の保護）。未設定なら登録不可（=必須運用）。 */
export const SIGNUP_CODE = process.env.SIGNUP_CODE || "";
