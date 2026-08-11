import Link from "next/link";
import { GitBranch, ArrowUpRight } from "lucide-react";
import { getAgents, colorClasses } from "@/lib/data";

const COLUMNS = [
  { key: "統括", title: "統括", gradient: "from-accent-indigo to-accent-violet" },
  { key: "コンサル", title: "コンサル事業部", gradient: "from-accent-amber to-accent-pink" },
  { key: "営業", title: "営業・マーケ", gradient: "from-accent-red to-accent-amber" },
  { key: "管理", title: "管理部門", gradient: "from-accent-teal to-brand-glow" },
  { key: "開発", title: "開発部門", gradient: "from-brand-glow to-accent-indigo" },
  { key: "横断", title: "横断チーム", gradient: "from-accent-violet to-accent-pink" },
];

export default function OrgMap() {
  const agents = getAgents();
  const cols = COLUMNS.map((c) => ({ ...c, items: agents.filter((a) => a.department === c.key) }));
  const project = agents.filter((a) => a.department === "プロジェクト");
  const sub = agents.filter((a) => a.department === "サブ");

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">組織マップ</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">部門カラム × カラーカードで全エージェントを一望</p>
        </div>
        <Link href="/org/graph" className="btn btn-primary self-start md:self-auto">
          <GitBranch className="w-3.5 h-3.5" /> 相互干渉グラフで見る <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cols.map((col, ci) => (
          <div
            key={col.key}
            className="card p-3 space-y-2 relative overflow-hidden animate-growFromBottom"
            style={{ animationDelay: `${ci * 60}ms` }}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${col.gradient}`} />
            <div className="text-center pt-1 pb-2.5 border-b" style={{ borderColor: "var(--card-border)" }}>
              <div className="text-xs font-bold tracking-wide">{col.title}</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{col.items.length} 体</div>
            </div>
            <div className="space-y-1.5">
              {col.items.map((a, i) => {
                const c = colorClasses[a.color] ?? colorClasses.muted;
                return (
                  <Link
                    key={a.id}
                    href={`/agents/${encodeURIComponent(a.id)}`}
                    className={`block px-2 py-1.5 rounded text-xs font-medium ${c.bg} ${c.text} hover:shadow transition truncate animate-growFromBottom`}
                    style={{ animationDelay: `${ci * 60 + i * 15}ms` }}
                  >
                    {a.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {project.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">プロジェクト特化エージェント</h2>
          <div className="flex flex-wrap gap-2">
            {project.map((a) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className={`px-3 py-1.5 rounded-full text-xs ${c.bg} ${c.text} hover:shadow transition`}>{a.name}</Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {sub.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">サブエージェント（Web Builder / Data Engineer 配下など）</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sub.map((a) => (
              <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className="card card-hover text-xs p-3">
                <div className="text-[var(--fg-muted)]">{a.parent}/</div>
                <div className="font-semibold">{a.name}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
