import membersJson from "@/config/members.json";
import { isRole, type Role } from "./roles";

export type Member = { email: string; name: string; role: Role };

const MEMBERS: Member[] = (membersJson.members as Array<{ email: string; name: string; role: string }>)
  .filter((m) => isRole(m.role))
  .map((m) => ({ email: m.email.trim().toLowerCase(), name: m.name, role: m.role as Role }));

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/**
 * メールからメンバーを解決する。
 * 1) config/members.json に一致 → その役割
 * 2) HUB_ALLOWED_DOMAIN と一致するドメイン → staff
 * 3) それ以外 → null（ログイン拒否）
 */
export function resolveMember(
  email: string | null | undefined,
  fallbackName?: string | null,
  allowedDomain: string | undefined = process.env.HUB_ALLOWED_DOMAIN,
): Member | null {
  const e = normalizeEmail(email);
  if (!e) return null;
  const hit = MEMBERS.find((m) => m.email === e);
  if (hit) return hit;
  const domain = (allowedDomain ?? "").trim().toLowerCase().replace(/^@/, "");
  if (domain && e.endsWith(`@${domain}`)) {
    return { email: e, name: (fallbackName ?? "").trim() || e.split("@")[0], role: "staff" };
  }
  return null;
}
