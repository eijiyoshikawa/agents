import { Activity, GitBranch, Briefcase, CalendarDays, TrendingUp } from "lucide-react";
import { getAgents, getKPIs, getProjects, getReports } from "@/lib/data";
import AnimatedCounter from "@/components/AnimatedCounter";

export default function Analytics() {
  const kpis = getKPIs();
  const agents = getAgents();
  const projects = getProjects();
  const reports = getReports();

  const withInterference = agents.filter((a) => (a.interferences?.length ?? 0) > 0).length;
  const withOutput = agents.filter((a) => a.output).length;
  const utilization = Math.round((withOutput / kpis.totals.agents) * 100);
  const coverage = Math.round((withInterference / kpis.totals.agents) * 100);

  const reportsByMonth: Record<string, number> = {};
  reports.forEach((r) => {
    const month = r.id.slice(0, 7);
    reportsByMonth[month] = (reportsByMonth[month] ?? 0) + 1;
  });
  const maxReports = Math.max(1, ...Object.values(reportsByMonth));

  const cards = [
    { id: "util", label: "稼働率", value: utilization, suffix: "%", icon: Activity, sub: `${withOutput} / ${kpis.totals.agents} 体に output`, accent: "from-brand-glow to-accent-teal" },
    { id: "cov", label: "相互干渉カバレッジ", value: coverage, suffix: "%", icon: GitBranch, sub: `平均 ${kpis.interferenceAvg} 体/エージェント`, accent: "from-accent-indigo to-accent-violet" },
    { id: "proj", label: "プロジェクト", value: projects.length, icon: Briefcase, sub: "agents/outputs/ 配下", accent: "from-accent-amber to-accent-pink" },
    { id: "rep", label: "日次レポート", value: reports.length, icon: CalendarDays, sub: `最新: ${reports[0]?.id ?? "—"}`, accent: "from-accent-violet to-accent-indigo" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">分析ダッシュボード</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">組織パフォーマンス</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">エージェント稼働率・相互干渉・部門配分・レポート傾向</p>
      </header>

      <section className="grid md:grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={c.id} className="card relative overflow-hidden animate-growFromBottom" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${c.accent} opacity-15`} />
              <Icon className="w-4 h-4 text-[var(--fg-muted)] relative" />
              <div className="h-section mt-3">{c.label}</div>
              <div className="stat-num text-3xl mt-1"><AnimatedCounter value={c.value} suffix={c.suffix ?? ""} /></div>
              <div className="text-xs text-[var(--fg-muted)] mt-1">{c.sub}</div>
            </div>
          );
        })}
      </section>

      <section className="card animate-growFromBottom" style={{ animationDelay: "200ms" }}>
        <h2 className="font-semibold mb-4">部門別リソース配分</h2>
        <div className="space-y-2.5">
          {kpis.departments.sort((a, b) => b.count - a.count).map((d, i) => (
            <div key={d.dept} className="flex items-center gap-3 text-sm">
              <span className="w-28 text-[var(--fg-muted)] text-xs">{d.dept}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
                <div
                  className="h-full bg-gradient-to-r from-brand-glow to-accent-indigo rounded-full"
                  style={{ width: `${(d.count / kpis.totals.agents) * 100}%`, transition: `width 800ms cubic-bezier(.2,.6,.2,1) ${i * 60}ms` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-xs font-medium">{d.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card animate-growFromBottom" style={{ animationDelay: "260ms" }}>
        <h2 className="font-semibold mb-4">レポート密度（月別）</h2>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(reportsByMonth).sort().map(([m, n]) => (
            <div key={m} className="text-center">
              <div className="h-28 rounded relative overflow-hidden" style={{ background: "var(--hover)" }}>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-glow to-accent-indigo transition-all" style={{ height: `${(n / maxReports) * 100}%` }} />
              </div>
              <div className="text-[10px] mt-1.5 text-[var(--fg-muted)]">{m}</div>
              <div className="text-xs font-semibold mt-0.5">{n}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card animate-growFromBottom" style={{ animationDelay: "320ms" }}>
        <h2 className="font-semibold mb-4">相互干渉トップ（接続数）</h2>
        <ul className="text-sm divide-y" style={{ borderColor: "var(--card-border)" }}>
          {[...agents].sort((a, b) => (b.interferences?.length ?? 0) - (a.interferences?.length ?? 0)).slice(0, 10).map((a) => (
            <li key={a.id} className="flex justify-between py-2">
              <span>{a.name} <span className="text-xs text-[var(--fg-muted)]">/ {a.department}</span></span>
              <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--hover)" }}>{a.interferences?.length ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
