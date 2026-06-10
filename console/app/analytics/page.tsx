import { getAgents, getKPIs, getProjects, getReports } from "@/lib/data";

export default function Analytics() {
  const kpis = getKPIs();
  const agents = getAgents();
  const projects = getProjects();
  const reports = getReports();

  const withInterference = agents.filter((a) => (a.interferences?.length ?? 0) > 0).length;
  const withOutput = agents.filter((a) => a.output).length;

  const reportsByMonth = reports.reduce<Record<string, number>>((acc, r) => {
    const month = r.id.slice(0, 7);
    acc[month] = (acc[month] ?? 0) + 1;
    return acc;
  }, {});

  const maxReports = Math.max(1, ...Object.values(reportsByMonth));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">分析</h1>
        <p className="text-ink-soft mt-1">エージェント稼働率・出力・相互干渉・レポート傾向</p>
      </header>

      <section className="grid md:grid-cols-4 gap-3">
        <div className="card">
          <div className="h-section">稼働率（output 有り）</div>
          <div className="text-3xl font-bold mt-2 text-brand">{Math.round((withOutput / kpis.totals.agents) * 100)}%</div>
          <div className="text-xs text-ink-muted">{withOutput} / {kpis.totals.agents}</div>
        </div>
        <div className="card">
          <div className="h-section">相互干渉カバレッジ</div>
          <div className="text-3xl font-bold mt-2 text-brand">{Math.round((withInterference / kpis.totals.agents) * 100)}%</div>
          <div className="text-xs text-ink-muted">平均 {kpis.interferenceAvg} 体/エージェント</div>
        </div>
        <div className="card">
          <div className="h-section">プロジェクト</div>
          <div className="text-3xl font-bold mt-2 text-brand">{projects.length}</div>
          <div className="text-xs text-ink-muted">agents/outputs/ 配下</div>
        </div>
        <div className="card">
          <div className="h-section">日次レポート</div>
          <div className="text-3xl font-bold mt-2 text-brand">{reports.length}</div>
          <div className="text-xs text-ink-muted">最新: {reports[0]?.id}</div>
        </div>
      </section>

      <section className="card">
        <h2 className="h-section mb-4">部門別リソース配分</h2>
        <div className="space-y-2">
          {kpis.departments.sort((a, b) => b.count - a.count).map((d) => (
            <div key={d.dept} className="flex items-center gap-3 text-sm">
              <span className="w-28 text-ink-muted">{d.dept}</span>
              <div className="flex-1 bg-ink/5 rounded h-3 overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${(d.count / kpis.totals.agents) * 100}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums">{d.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h-section mb-4">レポート密度（月別）</h2>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(reportsByMonth).sort().map(([m, n]) => (
            <div key={m} className="text-center">
              <div className="bg-ink/5 h-24 rounded relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-brand" style={{ height: `${(n / maxReports) * 100}%` }} />
              </div>
              <div className="text-xs mt-1 text-ink-muted">{m}</div>
              <div className="text-xs font-semibold">{n}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h-section mb-4">相互干渉トップ（接続数）</h2>
        <ul className="text-sm space-y-1">
          {[...agents].sort((a, b) => (b.interferences?.length ?? 0) - (a.interferences?.length ?? 0)).slice(0, 10).map((a) => (
            <li key={a.id} className="flex justify-between border-b border-ink/5 py-1">
              <span>{a.name} <span className="text-xs text-ink-muted">/ {a.department}</span></span>
              <span className="font-mono text-xs">{a.interferences?.length ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
