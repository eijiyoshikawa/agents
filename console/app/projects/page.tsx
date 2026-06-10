import Link from "next/link";
import { Briefcase, FileBox } from "lucide-react";
import { getProjects } from "@/lib/data";

export default function ProjectsIndex() {
  const projects = getProjects();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">プロジェクト</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{projects.length} 件 — <code className="text-xs">agents/outputs/</code></p>
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((p, i) => (
          <Link key={p.id} href={`/projects/${p.slug}`} className="card card-hover group relative overflow-hidden animate-growFromBottom" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-glow to-accent-indigo opacity-60" />
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[var(--fg-muted)]" />
              <span className="h-section">プロジェクト</span>
            </div>
            <h2 className="text-base font-semibold mt-2 truncate">{p.id}</h2>
            <p className="text-xs text-[var(--fg-muted)] mt-2 line-clamp-3">{p.summary || "(summary なし)"}</p>
            <div className="text-xs text-[var(--fg-muted)] mt-3 flex items-center gap-1">
              <FileBox className="w-3.5 h-3.5" /> {p.fileCount} files
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
