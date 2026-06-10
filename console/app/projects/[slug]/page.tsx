import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, FileBox } from "lucide-react";
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
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="w-3.5 h-3.5" /> プロジェクト一覧
      </Link>
      <header className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-glow via-accent-indigo to-accent-violet" />
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">プロジェクト</span>
        </div>
        <h1 className="text-3xl font-bold mt-2 tracking-tight">{project.id}</h1>
        <p className="text-xs text-[var(--fg-muted)] font-mono mt-2">{project.path}</p>
      </header>
      {project.summary ? (
        <section className="card">
          <h2 className="font-semibold mb-2">README 抜粋</h2>
          <pre className="text-sm whitespace-pre-wrap font-sans text-[var(--fg-soft)]">{project.summary}</pre>
        </section>
      ) : null}
      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><FileBox className="w-4 h-4" /> ファイル ({project.fileCount})</h2>
        <div className="space-y-4">
          {Object.entries(groups).map(([ext, files]) => (
            <div key={ext}>
              <div className="text-xs uppercase text-[var(--fg-muted)] font-semibold mb-1.5 flex items-center gap-2">
                <span className="pill">.{ext}</span>
                <span>{files.length}</span>
              </div>
              <ul className="text-xs font-mono space-y-1">
                {files.map((f) => <li key={f} className="text-[var(--fg-soft)]">{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
