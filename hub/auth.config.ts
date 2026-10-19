// Auth.js v5 設定（Edge 互換: middleware からも読み込まれるため Node 専用モジュールは使わない）。
// パスワード認証（Credentials）は Node 専用のため auth.ts 側で追加する。
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { resolveMember } from "@/lib/members";
import { isRole } from "@/lib/roles";

/** Google ログインは OAuth クライアントが設定されている場合のみ有効（任意） */
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: googleEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          authorization: { params: { prompt: "select_account" } },
        }),
      ]
    : [],
  callbacks: {
    // メンバー一覧（または許可ドメイン）に無いアカウントはログイン不可
    async signIn({ user }) {
      return resolveMember(user.email, user.name) !== null;
    },
    async jwt({ token, user }) {
      if (user) {
        const m = resolveMember(user.email, user.name);
        if (m) {
          token.email = m.email;
          token.name = m.name;
          token.role = m.role;
          token.allow = m.allow ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = isRole(token.role) ? token.role : "staff";
      session.user.allow = Array.isArray(token.allow) ? token.allow : null;
      session.user.mustChange = Boolean(token.mustChange);
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.name === "string") session.user.name = token.name;
      return session;
    },
  },
};
