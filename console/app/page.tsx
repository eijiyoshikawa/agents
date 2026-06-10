import Link from "next/link";
import {
  Users, Briefcase, Sparkles, CalendarDays, Network, ArrowUpRight,
} from "lucide-react";
import { getAgents, getKPIs, getProjects, getReports, colorClasses } from "@/lib/data";
import AnimatedCounter from "@/components/AnimatedCounter";
import SectionGate from "@/components/SectionGate";

export default function Page() {
  const kpis = getKPIs();
  const agents = getAgents();
  const projects = getProjects();
  const reports = getReports().slice(0, 5);

  const stats = [
    { id: "agents", label: "エージェント", value: kpis.totals.agents, href: "/agents", icon: Users, accent: "from-brand-glow to-accent-teal" },
    { id: "projects", label: "プロジェクト", value: kpis.totals.projects, href: "/projects", icon: Briefcase, accent: "from-accent-indigo to-accent-violet" },
    { id: "outputs", label: "出力済み", value: kpis.totals.withOutput, href: "/agents", icon: Sparkles, accent: "from-accent-amber to-accent-pink" },
    { id: "reports", label: "日次レポート", value: kpis.totals.reports, href: "/reports", icon: CalendarDays, accent: "from-accent-violet to-accent-indigo" },
    { id: "intf", label: "平均相互干渉", value: kpis.interferenceAvg, href: "/org", icon: Network, accent: "from-accent-teal to-brand-glow" },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-mesh px-8 py-10" style={{ borderColor: "var(--card-border)" }}>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)] font-semibold">Live · リアルタイム集計</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            <span className="gradient-text">社内エージェント</span>を一望
          </h1>
          <p className="text-base text-[var(--fg-soft)] mt-3 max-w-xl">
            46+ のエージェントとプロジェクト成果物・書類テンプレート・分析を、ひとつのコンソールから操作できます。
          </p>
          <div className="flex gap-2 mt-5">
            <Link href="/agents" className="btn btn-primary">エージェントを見る <ArrowUpRight className="w-3.5 h-3.5" /></Link>
            <Link href="/documents" className="btn btn-ghost">書類を作る</Link>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <SectionGate id="dashboard.kpis">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link key={s.id} href={s.href} className="card card-hover group relative overflow-hidden animate-growFromBottom" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${s.accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="flex items-center justify-between relative">
                  <Icon className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={2} />
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="h-section mt-3">{s.label}</div>
                <div className="stat-num text-3xl mt-1">
                  <AnimatedCounter value={s.value} />
                </div>
              </Link>
            );
          })}
        </section>
      </SectionGate>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionGate id="dashboard.departments">
          <div className="card animate-growFromBottom" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">部門別エージェント数</h2>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">全 {kpis.totals.agents} 体の配置</p>
              </div>
              <Link href="/agents" className="text-xs flex items-center gap-1 hover:underline">一覧 <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <ul className="space-y-2.5">
              {kpis.departments.sort((a, b) => b.count - a.count).map((d, i) => {
                const pct = (d.count / kpis.totals.agents) * 100;
                return (
                  <li key={d.dept} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-[var(--fg-muted)] text-xs">{d.dept}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
                      <div
                        className="h-full bg-gradient-to-r from-brand-glow to-accent-indigo rounded-full"
                        style={{ width: `${pct}%`, transition: `width 800ms cubic-bezier(.2,.6,.2,1) ${i * 60}ms` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-xs font-medium">{d.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </SectionGate>

        <SectionGate id="dashboard.reports">
          <div className="card animate-growFromBottom" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">最新の日次レポート</h2>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">直近 5件</p>
              </div>
              <Link href="/reports" className="text-xs flex items-center gap-1 hover:underline">一覧 <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <ul className="space-y-1">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-[var(--hover)] transition text-sm">
                    <span className="font-medium">{r.id}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SectionGate>
      </div>

      <SectionGate id="dashboard.agents">
        <section className="animate-growFromBottom" style={{ animationDelay: "420ms" }}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">エージェント・プレビュー</h2>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">主要メンバーから抜粋</p>
            </div>
            <Link href="/agents" className="text-xs flex items-center gap-1 hover:underline">全件 <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {agents.slice(0, 18).map((a, i) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className="card card-hover p-3 group animate-growFromBottom" style={{ animationDelay: `${420 + i * 25}ms` }}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${c.text}`}>{a.department}</span>
                  </div>
                  <div className="text-sm font-medium mt-1 truncate group-hover:text-brand-glow transition">{a.name}</div>
                </Link>
              );
            })}
          </div>
        </section>
      </SectionGate>

      <SectionGate id="dashboard.projects">
        <section className="animate-growFromBottom" style={{ animationDelay: "550ms" }}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">アクティブ・プロジェクト</h2>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">最近の {Math.min(6, projects.length)} 件</p>
            </div>
            <Link href="/projects" className="text-xs flex items-center gap-1 hover:underline">全件 <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {projects.slice(0, 6).map((p, i) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="card card-hover group relative overflow-hidden animate-growFromBottom" style={{ animationDelay: `${550 + i * 40}ms` }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-glow via-accent-indigo to-accent-violet opacity-60" />
                <div className="h-section">プロジェクト</div>
                <div className="text-base font-semibold mt-1.5 truncate">{p.id}</div>
                <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)] mt-2">
                  <span>📄 {p.fileCount} files</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </SectionGate>
    </div>
  );
}
