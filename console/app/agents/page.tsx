"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import agentsData from "@/data/agents.json";
import { colorClasses } from "@/lib/colors";
import { useConsole } from "@/components/ConsoleProviders";

type Agent = (typeof agentsData)[number] & { color: keyof typeof colorClasses; headline?: string; interferences?: string[] };

export default function AgentsIndex() {
  const { isVisible } = useConsole();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string | null>(null);

  const agents = agentsData as Agent[];
  const visibleAgents = agents.filter((a) => isVisible(`department:${a.department}`) ?? true);

  const filtered = useMemo(() => {
    let list = visibleAgents;
    if (dept) list = list.filter((a) => a.department === dept);
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(lq) || (a.headline ?? "").toLowerCase().includes(lq));
    }
    return list;
  }, [visibleAgents, q, dept]);

  const depts = Array.from(new Set(visibleAgents.map((a) => a.department)));
  const counts = Object.fromEntries(depts.map((d) => [d, visibleAgents.filter((a) => a.department === d).length]));

  const order = ["統括", "コンサル", "営業", "管理", "開発", "プロジェクト", "横断", "サブ", "廃止", "未分類"];

  const byDept: Record<string, Agent[]> = {};
  filtered.forEach((a) => { (byDept[a.department] ??= []).push(a); });
  const sortedDepts = Object.keys(byDept).sort((a, b) => (order.indexOf(a) + 100) - (order.indexOf(b) + 100));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">エージェント</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{filtered.length} 体 / 全 {visibleAgents.length} 体</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="名前・概要で検索"
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-transparent placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-brand-glow/30 w-64"
              style={{ borderColor: "var(--card-border)" }}
            />
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setDept(null)}
          className={`pill ${!dept ? "pill-brand" : ""} cursor-pointer`}
        >
          <Filter className="w-3 h-3" /> すべて <span className="opacity-50 ml-1">{visibleAgents.length}</span>
        </button>
        {depts.map((d) => (
          <button
            key={d}
            onClick={() => setDept(dept === d ? null : d)}
            className={`pill ${dept === d ? "pill-brand" : ""} cursor-pointer`}
          >
            {d} <span className="opacity-50 ml-0.5">{counts[d]}</span>
          </button>
        ))}
      </div>

      {sortedDepts.map((d, di) => (
        <section key={d} className="animate-growFromBottom" style={{ animationDelay: `${di * 60}ms` }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">{d}</h2>
            <span className="text-xs text-[var(--fg-muted)]">{byDept[d].length}</span>
            <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {byDept[d].map((a, i) => {
              const c = colorClasses[a.color] ?? colorClasses.muted;
              return (
                <Link
                  key={a.id}
                  href={`/agents/${encodeURIComponent(a.id)}`}
                  className="card card-hover group relative overflow-hidden animate-growFromBottom"
                  style={{ animationDelay: `${di * 60 + i * 20}ms` }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.dot} opacity-60`} />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${c.text}`}>{a.department}</span>
                  </div>
                  <div className="text-sm font-semibold mt-1.5 truncate group-hover:text-brand-glow transition">{a.name}</div>
                  {a.headline ? <div className="text-xs text-[var(--fg-muted)] mt-1 line-clamp-2">{a.headline}</div> : null}
                  <div className="text-[10px] text-[var(--fg-muted)] mt-3 flex items-center gap-2">
                    <span>相互干渉 <span className="font-semibold">{a.interferences?.length ?? 0}</span></span>
                    {a.outputPath ? <span className="pill pill-brand !py-0">output</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
