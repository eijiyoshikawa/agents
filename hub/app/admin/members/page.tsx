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
  let dbError: string | null = null;
  const members = dbOk
    ? await listMemberRecords().catch((e: unknown) => {
        dbError = e instanceof Error ? e.message : String(e);
        return [];
      })
    : [];
  const editing = members.find((m) => m.email === edit);
  const dashboards = allDashboardKeys();

  return (
    <>
      <Header name={session.user.name ?? session.user.email} role={session.user.role} showAdmin showPassword={dbOk} current="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <section className="space-y-6">
        <div>
          <h1 className="text-lg font-bold">メンバー管理（経営陣以外のログイン）</h1>
          <p className="mt-1 text-sm text-ink-2">
            入口は同じログイン画面です。ここで追加したメンバーは、役割と「見られる項目」の範囲内のダッシュボードだけが表示されます。初回ログイン時にパスワード変更を求めます。
          </p>
        </div>
        {dbError && (
          <div className="alert-watch">
            メンバー保存先（Postgres）に接続できませんでした: {dbError}。少し待って再読み込みしても直らない場合は HUB_DATABASE_URL の値を確認してください。
          </div>
        )}
        {!dbOk && (
          <div className="alert-watch">
            メンバー保存先（HUB_DATABASE_URL）が未設定のため追加できません。Vercel の Storage で Neon を接続し、<code>npm run hub:migrate</code> を実行してください。設定までは
            config/members.json の役員のみログインできます。
          </div>
        )}
        <div className="card p-6">
          <h2 className="font-semibold">設定ファイルのメンバー（役員・固定）</h2>
          <ul className="mt-2 text-sm text-ink">
            {configMembers().map((m) => (
              <li key={m.email}>
                {m.name} <span className="text-ink-3">{m.email}</span> <span className="chip chip-brand ml-1">{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
          </ul>
        </div>
        {dbOk && (
          <div className="card p-6">
            <h2 className="font-semibold">登録メンバー（{members.length} 名）</h2>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-ink-2">まだ登録がありません。</p>
            ) : (
              <table className="table-dark mt-3">
                <thead>
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
                    <tr key={m.email} style={m.active ? undefined : { opacity: 0.5 }}>
                      <td className="py-2">{m.name}</td>
                      <td className="text-ink-2">{m.email}</td>
                      <td>{ROLE_LABEL[m.role]}</td>
                      <td className="text-xs">{m.allow === null ? "役割のすべて" : m.allow.map((k) => dashboards.find((d) => d.key === k)?.title ?? k).join("・") || "（なし）"}</td>
                      <td className="text-xs">
                        {m.active ? "有効" : "無効"}
                        {m.mustChangePassword && m.active ? "・初回変更待ち" : ""}
                      </td>
                      <td className="text-right">
                        <a href={`/admin/members?edit=${encodeURIComponent(m.email)}`} className="link text-xs">
                          編集
                        </a>
                        <form action={toggleActiveAction} className="inline ml-2">
                          <input type="hidden" name="email" value={m.email} />
                          <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                          <button className="link text-xs">{m.active ? "無効化" : "再有効化"}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {dbOk && !dbError && <MemberForm dashboards={dashboards} editing={editing} />}
      </section>
      </main>
    </>
  );
}
