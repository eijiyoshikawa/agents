import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { clearFailures, clientKey, isBlocked, recordFailure } from "@/lib/login-limiter";
import { findMember, normalizeEmail } from "@/lib/members";
import { findMemberRecord } from "@/lib/member-store";
import { loadPasswordHashes, verifyPassword } from "@/lib/password";

/**
 * メールアドレス + パスワード。
 * 1) DB（hub_member）に登録されたメンバー: DB のハッシュで検証（無効化されたメンバーは拒否）
 * 2) config/members.json のメンバー（役員）: HUB_PASSWORD_HASHES（env）のハッシュで検証
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
    if (!email) return null;
    const rec = await findMemberRecord(email).catch(() => undefined);
    let ok = false;
    let name = "";
    if (rec) {
      ok = rec.active && verifyPassword(password, rec.passwordHash ?? undefined);
      name = rec.name;
    } else {
      const member = await findMember(email);
      ok = member !== null && verifyPassword(password, loadPasswordHashes()[member.email]);
      name = member?.name ?? "";
    }
    if (!ok) {
      recordFailure(key);
      return null;
    }
    clearFailures(key);
    return { id: email, email, name };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, credentials],
  callbacks: {
    ...authConfig.callbacks,
    // DB のメンバーも許可する（Edge 用の auth.config は設定ファイルのみ）
    async signIn({ user }) {
      return (await findMember(user.email, user.name)) !== null;
    },
    async jwt({ token, user, trigger }) {
      // ログイン時に加え、5 分ごとにメンバー情報（氏名・役割・見られる項目）を読み直す。
      // 設定ファイルや管理画面で直した氏名・権限が、再ログインなしで反映されるようにする。
      // 定期の読み直しはキャッシュ経由（管理画面での変更は即時に無効化される）。ログイン時・明示更新時は DB を直接読む
      const now = Math.floor(Date.now() / 1000);
      const refreshedAt = typeof token.refreshedAt === "number" ? token.refreshedAt : 0;
      if (user || trigger === "update" || now - refreshedAt > 300) {
        const m = await findMember(user?.email ?? token.email, user?.name, { cached: !user && trigger !== "update" });
        if (m) {
          token.email = m.email;
          token.name = m.name;
          token.role = m.role;
          token.allow = m.allow ?? null;
          token.mustChange = Boolean(m.mustChangePassword);
        }
        token.refreshedAt = now;
      }
      return token;
    },
  },
});
