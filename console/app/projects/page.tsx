import Link from "next/link";
import { getProjects } from "@/lib/data";

export default function ProjectsIndex() {
  const projects = getProjects();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">プロジェクト</h1>
        <p className="text-ink-soft mt-1">{projects.length} 件 — `agents/outputs/` 配下を横断</p>
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.slug}`} className="card hover:shadow-md transition">
            <div className="h-section">プロジェクト</div>
            <h2 className="text-base font-semibold mt-1">{p.id}</h2>
            <p className="text-xs text-ink-muted mt-2 line-clamp-3">{p.summary || "(summary なし)"}</p>
            <div className="text-xs text-ink-muted mt-3">📄 {p.fileCount} files</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
