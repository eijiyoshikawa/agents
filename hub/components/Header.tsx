import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABEL, type Role } from "@/lib/roles";

type Props = { name: string; role: Role; showAdmin?: boolean; showPassword?: boolean; current?: "home" | "admin" | "password" };

/** 上部ナビ（masterAI /kpi・/ops と同じ構成の紺色バー） */
export function Header({ name, role, showAdmin, showPassword, current = "home" }: Props) {
  const linkCls = (active: boolean) =>
    `inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-300 ease-standard ${
      active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-white/5 hover:text-ink"
    }`;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[#071129]/85 backdrop-blur">
      <div className="mx-auto flex min-h-[58px] max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex-nowrap sm:py-0 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 whitespace-nowrap font-extrabold tracking-wide text-ink">
          <i aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" />
          LET 経営ハブ
        </Link>
        <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          <Link href="/" className={linkCls(current === "home")} aria-current={current === "home" ? "page" : undefined}>
            ダッシュボード
          </Link>
          {showAdmin && (
            <Link href="/admin/members" className={linkCls(current === "admin")} aria-current={current === "admin" ? "page" : undefined}>
              メンバー管理
            </Link>
          )}
          {showPassword && (
            <Link href="/account/password" className={linkCls(current === "password")} aria-current={current === "password" ? "page" : undefined}>
              パスワード変更
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-xs text-ink-2">
          <span className="hidden sm:inline">{name}</span>
          <span className="chip chip-brand">{ROLE_LABEL[role]}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="btn-ghost">ログアウト</button>
          </form>
        </div>
      </div>
    </header>
  );
}
