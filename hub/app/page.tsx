import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardCard } from "@/components/DashboardCard";
import { Header } from "@/components/Header";
import { dashboardsForMember } from "@/lib/dashboards";
import { hubDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const { name, email, role, allow } = session.user;
  const dashboards = dashboardsForMember(role, allow);
  const restricted = Array.isArray(allow);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Header name={name ?? email} role={role} showAdmin={role === "exec"} showPassword={hubDbConfigured()} />
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-ink/60">ダッシュボード</h2>
          <span className="text-xs text-ink/40">{dashboards.length} 件</span>
        </div>
        {dashboards.length === 0 ? (
          <p className="card mt-4 p-6 text-sm text-ink/70">閲覧できるダッシュボードがありません。管理者に権限の付与を依頼してください。</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dashboards.map((d, i) => (
              <DashboardCard key={d.key} d={d} index={i} />
            ))}
          </div>
        )}
      </section>
      <footer className="mt-12 border-t border-ink/10 pt-4 text-xs text-ink/50 leading-relaxed">
        ここで一度ログインすると、共通ログインに対応したダッシュボードへは再ログインなしで移動できます。
        「個別ログイン」のダッシュボードは移行完了まで従来の ID / パスワードが必要です。
        {restricted && " 権限のない項目は表示されません。"}
      </footer>
    </main>
  );
}
