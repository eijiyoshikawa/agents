import type { Role } from "@/lib/roles";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /** パスワードログイン（authorize）が照合済みのメンバー情報を載せて返す。signIn / jwt で DB を読み直さないため */
  interface User {
    role?: Role;
    allow?: string[] | null;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: DefaultSession["user"] & { role: Role; allow?: string[] | null; mustChange?: boolean };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    allow?: string[] | null;
    mustChange?: boolean;
  }
}
