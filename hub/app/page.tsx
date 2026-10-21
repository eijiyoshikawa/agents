import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardCard } from "@/components/DashboardCard";
import { Header } from "@/components/Header";
import { dashboardsForMember, type Dashboard } from "@/lib/dashboards";
import { hubDbConfigured } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";

export const dynamic = "force-dynamic";

const GROUP_ORDER = ["経営・財務", "営業・マーケティング", "人材紹介", "社内ツール", "その他"];

function groupBy(list: Dashboard[]): [string, Dashboard[]][] {
  const map = new Map<string, Dashboard[]>();
  for (const d of list) map.set(d.group, [...(map.get(d.group) ?? []), d]);
  return [...map.entries()].sort(([a], [b]) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const { name, email, role, allow } = session.user;
  const dashboards = dashboardsForMember(role, allow);
  const restricted = Array.isArray(allow);
  const ready = dashboards.filter((d) => d.sso === "ready").length;
  const planned = dashboards.filter((d) => d.sso === "planned").length;
  const groups = groupBy(dashboards);
  let index = 0;

  return (
    <>
      <Header name={name ?? email} role={role} showAdmin={role === "exec"} showPassword={hubDbConfigured()} current="home" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest text-ink-3">株式会社LET</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">ダッシュボード</h1>
            <p className="mt-1 text-sm text-ink-2">
              {name ?? email} さん（{ROLE_LABEL[role]}）が閲覧できる項目を表示しています。
              {restricted && " 権限のない項目は表示されません。"}
            </p>
          </div>
        </div>

        <section className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4" aria-label="概要">
          <div className="stat">
            <div className="stat-label">閲覧できる項目</div>
            <div className="stat-value text-[#4f8ff7]">{dashboards.length}</div>
            <div className="stat-sub">件</div>
          </div>
          <div className="stat">
            <div className="stat-label">共通ログイン対応</div>
            <div className="stat-value text-[#2fd3b5]">{ready}</div>
            <div className="stat-sub">再ログインなしで移動</div>
          </div>
          <div className="stat">
            <div className="stat-label">個別ログイン</div>
            <div className="stat-value text-[#f5c33b]">{planned}</div>
            <div className="stat-sub">統合予定・従来の ID/PW</div>
          </div>
          <div className="stat">
            <div className="stat-label">あなたの役割</div>
            <div className="stat-value text-[#8f8cf5]">{ROLE_LABEL[role]}</div>
            <div className="stat-sub">{email}</div>
          </div>
        </section>

        {dashboards.length === 0 ? (
          <p className="card mt-8 p-6 text-sm text-ink-2">閲覧できるダッシュボードがありません。管理者に権限の付与を依頼してください。</p>
        ) : (
          groups.map(([group, items]) => (
            <section key={group} className="mt-8">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3">{group}</h2>
                <span className="text-xs text-ink-3">{items.length} 件</span>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <DashboardCard key={d.key} d={d} index={index++} />
                ))}
              </div>
            </section>
          ))
        )}

        <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
          ここで一度ログインすると、共通ログインに対応したダッシュボードへは再ログインなしで移動できます。
          「個別ログイン」のダッシュボードは移行完了まで従来の ID / パスワードが必要です。
        </footer>
      </main>
    </>
  );
}
