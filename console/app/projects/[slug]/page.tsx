import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects } from "@/lib/data";

export async function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjects().find((p) => p.slug === slug);
  if (!project) notFound();
  const groups: Record<string, string[]> = {};
  project.files.forEach((f) => {
    const ext = f.split(".").pop()?.toLowerCase() ?? "?";
    (groups[ext] ??= []).push(f);
  });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted"><Link href="/projects">← プロジェクト一覧</Link></nav>
      <header>
        <h1 className="text-3xl font-bold">{project.id}</h1>
        <p className="text-ink-soft mt-1 font-mono text-xs">{project.path}</p>
      </header>
      {project.summary ? (
        <section className="card">
          <h2 className="h-section mb-2">README 抜粋</h2>
          <pre className="text-sm whitespace-pre-wrap font-sans">{project.summary}</pre>
        </section>
      ) : null}
      <section className="card">
        <h2 className="h-section mb-3">ファイル ({project.fileCount})</h2>
        <div className="space-y-4">
          {Object.entries(groups).map(([ext, files]) => (
            <div key={ext}>
              <div className="text-xs uppercase text-ink-muted font-semibold mb-1">.{ext} ({files.length})</div>
              <ul className="text-xs font-mono space-y-1">
                {files.map((f) => <li key={f} className="text-ink-soft">{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
