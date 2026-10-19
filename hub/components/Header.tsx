import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export function Header({ name, role, showAdmin, showPassword }: { name: string; role: Role; showAdmin?: boolean; showPassword?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
      <div>
        <div className="text-xs tracking-widest text-ink/50">株式会社LET</div>
        <Link href="/" className="text-2xl font-bold tracking-tight">
          経営ハブ
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {showAdmin && (
          <Link href="/admin/members" className="text-xs text-ink/70 underline-offset-2 hover:underline">
            メンバー管理
          </Link>
        )}
        {showPassword && (
          <Link href="/account/password" className="text-xs text-ink/70 underline-offset-2 hover:underline">
            パスワード変更
          </Link>
        )}
        <span className="chip bg-brand/10 text-brand-dark">{ROLE_LABEL[role]}</span>
        <span className="text-ink/80">{name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-ink/5 transition-colors duration-300 ease-standard">
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
