import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { hubDbConfigured } from "@/lib/db";
import { allDashboardKeys } from "@/lib/dashboards";
import { listMemberRecords } from "@/lib/member-store";
import { configMembers } from "@/lib/members";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { MemberForm } from "./member-form";
import { ImportConfigMember, MemberRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

type DashboardOption = ReturnType<typeof allDashboardKeys>[number];

/** ログインできるサイト: 1 サイト = 1 タグ（タグの途中では改行しない） */
function SiteChips({ allow, role, dashboards }: { allow: string[] | null; role: Role; dashboards: DashboardOption[] }) {
  if (allow === null) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="chip chip-brand">すべてのサイト</span>
        <span className="text-xs text-ink-3">{ROLE_LABEL[role]}が見られる範囲</span>
      </div>
    );
  }
  if (allow.length === 0) return <span className="chip chip-muted">なし</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {allow.map((k) => (
        <span key={k} className="chip chip-muted">
          {dashboards.find((d) => d.key === k)?.title ?? k}
        </span>
      ))}
    </div>
  );
}

/** メールアドレス。長いときは「@」の前で改行する（途中で切れて見づらくならないように） */
function Email({ value }: { value: string }) {
  const at = value.indexOf("@");
  if (at <= 0) return <>{value}</>;
  return (
    <>
      {value.slice(0, at)}
      <wbr />
      {value.slice(at)}
    </>
  );
}

/** 状態: 有効 / 初回変更待ち / 無効 */
function StatusChip({ active, mustChange }: { active: boolean; mustChange: boolean }) {
  if (!active) return <span className="chip chip-muted status">無効</span>;
  if (mustChange) return <span className="chip chip-watch status" title="有効。初回ログインでのパスワード変更待ち">初回変更待ち</span>;
  return <span className="chip chip-good status">有効</span>;
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const dbOk = hubDbConfigured();
  let dbError: string | null = null;
  // セッション確認と一覧の読み込みを並行して始める（/admin は middleware で役員以外を弾いている。役員でなければ一覧は使わずに戻す）
  const [session, members, { edit }] = await Promise.all([
    auth(),
    dbOk
      ? listMemberRecords().catch((e: unknown) => {
          dbError = e instanceof Error ? e.message : String(e);
          return [];
        })
      : Promise.resolve([]),
    searchParams,
  ]);
  if (!session?.user?.email) redirect("/login");
  if (session.user.role !== "exec") redirect("/");
  const editing = members.find((m) => m.email === edit);
  const dashboards = allDashboardKeys();

  return (
    <>
      <Header name={session.user.name ?? session.user.email} role={session.user.role} showAdmin showPassword={dbOk} current="admin" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="space-y-6">
        <div>
          <h1 className="text-lg font-bold">メンバー管理（経営陣以外のログイン）</h1>
          <p className="mt-1 text-sm text-ink-2">
            入口は同じログイン画面（hub.let-inc.net/login）です。メンバーごとに「ログインできるサイト」をチェックで選びます。チェックしたサイトだけがハブに表示され、そのサイトに直接アクセスしたときも同じ判定で通します。初回ログイン時にパスワード変更を求めます。
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
        {dbOk && !dbError && editing && (
          <div id="member-form">
            <MemberForm dashboards={dashboards} editing={editing} />
            <p className="mt-2 text-sm">
              <a href="/admin/members" className="link">編集をやめて一覧に戻る</a>
            </p>
          </div>
        )}
        <div className="card p-6">
          <h2 className="font-semibold">設定ファイルのメンバー（役員）</h2>
          <p className="mt-1 text-xs text-ink-2">
            config/members.json に固定で入っている役員。「編集できるようにする」を押すと登録メンバーに取り込まれ、氏名・役割・パスワード再発行・無効化を画面から行えます（取り込んだメンバーは設定ファイルより優先されます）。
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {configMembers().map((m) => {
              const inDb = members.find((d) => d.email === m.email);
              return (
                <li key={m.email} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium [word-break:keep-all]">{m.name}</span>
                    <span className="text-ink-3 [overflow-wrap:anywhere]">
                      <Email value={m.email} />
                    </span>
                    <span className="chip chip-brand">{ROLE_LABEL[m.role]}</span>
                  </span>
                  {/* 取り込み後も同じ部品を出し続ける（取り込み直後に出す初期パスワードが再描画で消えないように） */}
                  <ImportConfigMember email={m.email} name={m.name} managed={Boolean(inDb)} enabled={dbOk && !dbError} />
                </li>
              );
            })}
          </ul>
        </div>
        {dbOk && (
          <div className="card p-6">
            <h2 className="font-semibold">登録メンバー（{members.length} 名）</h2>
            <p className="mt-1 text-xs text-ink-2">編集＝氏名・ログインできるサイト・権限の変更。無効化＝ログイン停止（復帰可）。パスワード再発行＝初期パスワードを作り直して 1 回表示。削除＝完全に消す（元に戻せない）。</p>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-ink-2">まだ登録がありません。</p>
            ) : (
              <table className="table-dark table-stack mt-3">
                <thead>
                  <tr>
                    <th className="py-1">氏名・メール（ログイン ID）</th>
                    <th>ログインできるサイト</th>
                    <th>権限</th>
                    <th>状態</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.email} className={m.active ? undefined : "opacity-60"}>
                      <td className="py-2 lg:min-w-[12rem]">
                        <div className="font-medium text-ink [word-break:keep-all]">{m.name}</div>
                        <div className="text-xs text-ink-3 [overflow-wrap:anywhere]">
                          <Email value={m.email} />
                        </div>
                      </td>
                      <td data-label="ログイン先" className="lg:min-w-[12rem]">
                        <SiteChips allow={m.allow} role={m.role} dashboards={dashboards} />
                      </td>
                      <td data-label="権限">
                        <span>
                          <span className="chip chip-brand">{ROLE_LABEL[m.role]}</span>
                        </span>
                      </td>
                      <td data-label="状態">
                        <span>
                          <StatusChip active={m.active} mustChange={m.mustChangePassword} />
                        </span>
                      </td>
                      <td className="py-2">
                        <MemberRowActions email={m.email} name={m.name} active={m.active} isSelf={m.email === session.user.email} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {dbOk && !dbError && !editing && <MemberForm dashboards={dashboards} />}
      </section>
      </main>
    </>
  );
}
