import { signOut } from "@/auth";
import { ROLE_LABEL, type Role } from "@/lib/roles";

export function Header({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex items-center justify-between border-b border-ink/10 pb-4">
      <div>
        <div className="text-xs tracking-widest text-ink/50">株式会社LET</div>
        <h1 className="text-2xl font-bold tracking-tight">経営ハブ</h1>
      </div>
      <div className="flex items-center gap-3 text-sm">
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
