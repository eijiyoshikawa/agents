import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { clearFailures, clientKey, isBlocked, recordFailure } from "@/lib/login-limiter";
import { normalizeEmail, resolveMember } from "@/lib/members";
import { loadPasswordHashes, verifyPassword } from "@/lib/password";

/**
 * メールアドレス + パスワード。
 * メンバーは config/members.json、パスワードのハッシュは HUB_PASSWORD_HASHES（env）で管理する。
 */
const credentials = Credentials({
  id: "credentials",
  name: "メールアドレスとパスワード",
  credentials: { email: { label: "メールアドレス" }, password: { label: "パスワード", type: "password" } },
  async authorize(raw, req) {
    const key = clientKey(req);
    if (isBlocked(key)) return null;
    const email = normalizeEmail(typeof raw?.email === "string" ? raw.email : null);
    const password = typeof raw?.password === "string" ? raw.password : "";
    // パスワード認証は登録メンバーのみ（許可ドメインによる自動許可は Google ログイン専用）
    const member = email ? resolveMember(email, null, "") : null;
    const ok = member !== null && verifyPassword(password, loadPasswordHashes()[member.email]);
    if (!ok) {
      recordFailure(key);
      return null;
    }
    clearFailures(key);
    return { id: member.email, email: member.email, name: member.name };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, credentials],
});
