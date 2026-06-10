import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgents, readRepoFile, colorClasses } from "@/lib/data";
import { mdToHtml } from "@/lib/markdown";

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
      <nav className="text-sm text-ink-muted">
        <Link href="/agents">← エージェント一覧</Link>
      </nav>
      <header className={`card ${c.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className={`text-[10px] uppercase tracking-wider ${c.text} font-bold`}>{agent.department}</span>
        </div>
        <h1 className="text-2xl font-bold mt-2">{agent.name}</h1>
        {agent.headline ? <p className="text-ink-soft mt-1">{agent.headline}</p> : null}
        <div className="text-xs text-ink-muted mt-3 space-x-3">
          {agent.promptPath ? <span>📄 {agent.promptPath}</span> : null}
          {agent.outputPath ? <span>📊 {agent.outputPath}</span> : null}
        </div>
      </header>

      {agent.interferences && agent.interferences.length > 0 ? (
        <section className="card">
          <h2 className="h-section mb-3">相互干渉ネットワーク（推測抽出）</h2>
          <div className="flex flex-wrap gap-1.5">
            {agent.interferences.map((i) => (
              <Link key={i} href={`/agents/${encodeURIComponent(i)}`} className="pill hover:bg-brand/10 hover:text-brand">{i}</Link>
            ))}
          </div>
        </section>
      ) : null}

      {html ? (
        <section className="card prose-md max-w-none">
          <h2 className="h-section mb-3">プロンプト</h2>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </section>
      ) : null}

      {agent.output ? (
        <section className="card">
          <h2 className="h-section mb-3">最新 output.json</h2>
          <pre className="text-xs overflow-auto bg-ink/5 p-3 rounded max-h-[500px]">{JSON.stringify(agent.output, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
