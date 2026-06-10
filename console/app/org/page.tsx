import Link from "next/link";
import { getAgents, colorClasses } from "@/lib/data";

const COLUMNS = [
  { key: "統括", title: "統括" },
  { key: "コンサル", title: "コンサル事業部" },
  { key: "営業", title: "営業・マーケ" },
  { key: "管理", title: "管理部門" },
  { key: "開発", title: "開発部門" },
  { key: "横断", title: "横断チーム" },
];

export default function OrgMap() {
  const agents = getAgents();
  const cols = COLUMNS.map((c) => ({ ...c, items: agents.filter((a) => a.department === c.key) }));
  const project = agents.filter((a) => a.department === "プロジェクト");
  const sub = agents.filter((a) => a.department === "サブ");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">組織マップ</h1>
        <p className="text-ink-soft mt-1">添付資料のような部門列＋カラー区分のリソース可視化</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cols.map((col) => (
          <div key={col.key} className="card p-3 space-y-2 bg-cream">
            <div className="h-section text-center pb-2 border-b border-ink/10">{col.title}</div>
            {col.items.map((a) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className={`block px-2 py-1.5 rounded text-xs font-medium ${c.bg} ${c.text} hover:shadow truncate`}>
                  {a.name}
                </Link>
              );
            })}
          </div>
        ))}
      </section>

      {project.length > 0 ? (
        <section>
          <h2 className="h-section mb-3">プロジェクト特化エージェント</h2>
          <div className="flex flex-wrap gap-2">
            {project.map((a) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className={`px-3 py-1.5 rounded-full text-xs ${c.bg} ${c.text}`}>{a.name}</Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {sub.length > 0 ? (
        <section>
          <h2 className="h-section mb-3">サブエージェント（Web Builder / Data Engineer 配下など）</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sub.map((a) => (
              <Link key={a.id} href={`/agents/${encodeURIComponent(a.id)}`} className="card text-xs">
                <div className="text-ink-muted">{a.parent}/</div>
                <div className="font-semibold">{a.name}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
