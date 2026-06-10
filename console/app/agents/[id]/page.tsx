import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Database, GitBranch } from "lucide-react";
import { getAgents, readRepoFile, colorClasses } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";
import SectionGate from "@/components/SectionGate";

export async function generateStaticParams() {
  return getAgents().map((a) => ({ id: encodeURIComponent(a.id) }));
}

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const agent = getAgents().find((a) => a.id === decoded);
  if (!agent) notFound();

  const md = agent.promptPath ? readRepoFile(agent.promptPath) : null;
  const html = md ? await mdToHtml(md) : "";
  const c = colorClasses[agent.color] ?? colorClasses.muted;

  return (
    <div className="space-y-6">
      <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="w-3.5 h-3.5" /> エージェント一覧
      </Link>

      <header className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-glow via-accent-indigo to-accent-violet" />
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          <span className={`text-[10px] uppercase tracking-widest font-bold ${c.text}`}>{agent.department}</span>
        </div>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{agent.name}</h1>
        {agent.headline ? <p className="text-[var(--fg-soft)] mt-2 max-w-3xl">{agent.headline}</p> : null}
        <div className="flex flex-wrap gap-3 text-xs text-[var(--fg-muted)] mt-4">
          {agent.promptPath ? (
            <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{agent.promptPath}</span>
          ) : null}
          {agent.outputPath ? (
            <span className="inline-flex items-center gap-1"><Database className="w-3.5 h-3.5" />{agent.outputPath}</span>
          ) : null}
          {(agent.interferences?.length ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />相互干渉 {agent.interferences!.length} 体</span>
          ) : null}
        </div>
      </header>

      {agent.interferences && agent.interferences.length > 0 ? (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4" /> 相互干渉ネットワーク</h2>
          <div className="flex flex-wrap gap-1.5">
            {agent.interferences.map((i) => (
              <Link key={i} href={`/agents/${encodeURIComponent(i)}`} className="pill hover:pill-brand transition">{i}</Link>
            ))}
          </div>
        </section>
      ) : null}

      <SectionGate id="agent.prompt">
        {html ? (
          <section className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> プロンプト</h2>
            <div className="prose-md max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        ) : null}
      </SectionGate>

      <SectionGate id="agent.output">
        {agent.output ? (
          <section className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Database className="w-4 h-4" /> 最新 output.json</h2>
            <pre className="text-xs overflow-auto p-3 rounded max-h-[500px] scrollbar-thin" style={{ background: "var(--hover)" }}>{JSON.stringify(agent.output, null, 2)}</pre>
          </section>
        ) : null}
      </SectionGate>
    </div>
  );
}
