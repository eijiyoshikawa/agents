import Link from "next/link";
import { getAgents, getKPIs, getProjects, getReports, colorClasses } from "@/lib/data";

export default function Page() {
  const kpis = getKPIs();
  const agents = getAgents();
  const projects = getProjects();
  const reports = getReports().slice(0, 5);

  const stats = [
    { label: "エージェント", value: kpis.totals.agents, href: "/agents" },
    { label: "プロジェクト", value: kpis.totals.projects, href: "/projects" },
    { label: "出力済み", value: kpis.totals.withOutput, href: "/agents" },
    { label: "日次レポート", value: kpis.totals.reports, href: "/reports" },
    { label: "平均相互干渉", value: kpis.interferenceAvg, href: "/org" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">社内コンソール</h1>
        <p className="text-ink-soft mt-1">46+ エージェント組織・プロジェクト・書類・分析を一元化</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card hover:shadow-md transition-shadow">
            <div className="h-section">{s.label}</div>
            <div className="text-3xl font-bold mt-2 text-brand">{s.value}</div>
          </Link>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-section">部門別エージェント数</h2>
            <Link href="/agents" className="text-xs">一覧 →</Link>
          </div>
          <ul className="space-y-2">
            {kpis.departments.map((d) => (
              <li key={d.dept} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-ink-muted">{d.dept}</span>
                <div className="flex-1 bg-ink/5 rounded h-2 overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${(d.count / kpis.totals.agents) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-section">最新の日次レポート</h2>
            <Link href="/reports" className="text-xs">一覧 →</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="hover:underline">{r.id}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="h-section">エージェント・プレビュー</h2>
          <Link href="/agents" className="text-xs">全件 →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {agents.slice(0, 18).map((a) => {
            const c = colorClasses[a.color] ?? colorClasses.muted;
            return (
              <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className={`p-3 rounded border ${c.ring} ring-1 ${c.bg} hover:shadow-sm transition`}>
                <div className={`text-xs uppercase ${c.text} font-semibold`}>{a.department}</div>
                <div className="text-sm font-medium text-ink truncate">{a.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-3">
        {projects.slice(0, 6).map((p) => (
          <Link key={p.id} href={`/projects/${p.slug}`} className="card hover:shadow-md transition-shadow">
            <div className="h-section">プロジェクト</div>
            <div className="text-base font-semibold mt-1 truncate">{p.id}</div>
            <div className="text-xs text-ink-muted mt-1">{p.fileCount} files</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
