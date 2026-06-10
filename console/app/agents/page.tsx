import Link from "next/link";
import { getAgents, colorClasses } from "@/lib/data";

export default function AgentsIndex() {
  const agents = getAgents();
  const byDept = agents.reduce<Record<string, typeof agents>>((acc, a) => {
    (acc[a.department] ??= []).push(a);
    return acc;
  }, {});
  const order = ["統括", "コンサル", "営業", "管理", "開発", "プロジェクト", "横断", "サブ", "廃止", "未分類"];
  const sortedDepts = Object.keys(byDept).sort((a, b) => (order.indexOf(a) + 100) - (order.indexOf(b) + 100));

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">エージェント</h1>
          <p className="text-ink-soft mt-1">{agents.length} 体（サブエージェント含む）</p>
        </div>
      </header>
      {sortedDepts.map((dept) => (
        <section key={dept}>
          <h2 className="h-section mb-3">{dept} <span className="text-ink-muted ml-2 normal-case">{byDept[dept].length}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {byDept[dept].map((a) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className={`p-4 rounded border ${c.ring} ring-1 ${c.bg} hover:shadow-md transition`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className={`text-[10px] uppercase tracking-wider ${c.text} font-bold`}>{a.department}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1 truncate">{a.name}</div>
                  {a.headline ? <div className="text-xs text-ink-muted mt-1 line-clamp-2">{a.headline}</div> : null}
                  <div className="text-[10px] text-ink-muted mt-2">相互干渉 {a.interferences?.length ?? 0}</div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
