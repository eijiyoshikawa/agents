import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { hubDbConfigured } from "@/lib/db";
import { allDashboardKeys } from "@/lib/dashboards";
import { listMemberRecords } from "@/lib/member-store";
import { configMembers } from "@/lib/members";
import { ROLE_LABEL } from "@/lib/roles";
import { MemberForm } from "./member-form";
import { toggleActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (session.user.role !== "exec") redirect("/");
  const { edit } = await searchParams;
  const dbOk = hubDbConfigured();
  const members = dbOk ? await listMemberRecords() : [];
  const editing = members.find((m) => m.email === edit);
  const dashboards = allDashboardKeys();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Header name={session.user.name ?? session.user.email} role={session.user.role} showAdmin showPassword={dbOk} />
      <section className="mt-8 space-y-6">
        <div>
          <h1 className="text-lg font-bold">メンバー管理（経営陣以外のログイン）</h1>
          <p className="mt-1 text-sm text-ink/70">
            入口は同じログイン画面です。ここで追加したメンバーは、役割と「見られる項目」の範囲内のダッシュボードだけが表示されます。初回ログイン時にパスワード変更を求めます。
          </p>
        </div>
        {!dbOk && (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            メンバー保存先（HUB_DATABASE_URL）が未設定のため追加できません。Vercel の Storage で Neon を接続し、<code>npm run hub:migrate</code> を実行してください。設定までは
            config/members.json の役員のみログインできます。
          </div>
        )}
        <div className="card p-6">
          <h2 className="font-semibold">設定ファイルのメンバー（役員・固定）</h2>
          <ul className="mt-2 text-sm text-ink/80">
            {configMembers().map((m) => (
              <li key={m.email}>
                {m.name} <span className="text-ink/50">{m.email}</span> <span className="chip bg-brand/10 text-brand-dark ml-1">{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
          </ul>
        </div>
        {dbOk && (
          <div className="card p-6">
            <h2 className="font-semibold">登録メンバー（{members.length} 名）</h2>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-ink/60">まだ登録がありません。</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-ink/50">
                  <tr>
                    <th className="py-1">氏名</th>
                    <th>メール</th>
                    <th>役割</th>
                    <th>見られる項目</th>
                    <th>状態</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.email} className="border-t border-ink/10" style={m.active ? undefined : { opacity: 0.5 }}>
                      <td className="py-2">{m.name}</td>
                      <td className="text-ink/70">{m.email}</td>
                      <td>{ROLE_LABEL[m.role]}</td>
                      <td className="text-xs">{m.allow === null ? "役割のすべて" : m.allow.map((k) => dashboards.find((d) => d.key === k)?.title ?? k).join("・") || "（なし）"}</td>
                      <td className="text-xs">
                        {m.active ? "有効" : "無効"}
                        {m.mustChangePassword && m.active ? "・初回変更待ち" : ""}
                      </td>
                      <td className="text-right">
                        <a href={`/admin/members?edit=${encodeURIComponent(m.email)}`} className="text-xs underline">
                          編集
                        </a>
                        <form action={toggleActiveAction} className="inline ml-2">
                          <input type="hidden" name="email" value={m.email} />
                          <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                          <button className="text-xs underline">{m.active ? "無効化" : "再有効化"}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {dbOk && <MemberForm dashboards={dashboards} editing={editing} />}
      </section>
    </main>
  );
}
