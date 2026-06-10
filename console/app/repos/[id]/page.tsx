import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ExternalLink, GitCommit, Star, GitFork, AlertCircle,
  Folder, FileText, Lock, Globe, Calendar,
} from "lucide-react";
import reposData from "@/data/repos.json";
import { mdToHtml } from "@/lib/markdown";
import RepoFileTree from "./tree";

export async function generateStaticParams() {
  const items = (reposData as any).items ?? [];
  if (items.length === 0) return [{ id: "_empty" }];
  return items.map((r: any) => ({ id: r.id }));
}

export const dynamicParams = false;

export default async function RepoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = ((reposData as any).items ?? []).find((r: any) => r.id === id);
  if (!repo) notFound();
  const readmeHtml = repo.readme ? await mdToHtml(repo.readme) : "";

  return (
    <div className="space-y-6">
      <Link href="/repos" className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="w-3.5 h-3.5" /> リポジトリ一覧
      </Link>

      <header className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-glow via-accent-indigo to-accent-violet" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {repo.repoMeta?.private ? <Lock className="w-3.5 h-3.5 text-[var(--fg-muted)]" /> : <Globe className="w-3.5 h-3.5 text-[var(--fg-muted)]" />}
              <span className="h-section">{repo.category}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{repo.label}</h1>
            <a href={repo.repoMeta?.htmlUrl} target="_blank" rel="noreferrer" className="text-xs font-mono mt-2 inline-flex items-center gap-1">
              {repo.fullName}
              <ExternalLink className="w-3 h-3" />
            </a>
            {repo.description ? <p className="text-sm text-[var(--fg-soft)] mt-3 max-w-3xl">{repo.description}</p> : null}
            <div className="flex flex-wrap gap-3 text-xs text-[var(--fg-muted)] mt-4">
              {repo.repoMeta?.language ? <span className="pill">{repo.repoMeta.language}</span> : null}
              <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {repo.repoMeta?.stars ?? 0}</span>
              <span className="inline-flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {repo.repoMeta?.forks ?? 0}</span>
              <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {repo.repoMeta?.openIssues ?? 0} issues</span>
              {repo.repoMeta?.pushedAt ? (
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(repo.repoMeta.pushedAt).toLocaleDateString("ja-JP")}</span>
              ) : null}
            </div>
            {(repo.repoMeta?.topics ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-3">
                {repo.repoMeta.topics.map((t: string) => <span key={t} className="pill text-[10px]">{t}</span>)}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {repo.commits?.length > 0 ? (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><GitCommit className="w-4 h-4" /> 直近のコミット</h2>
          <ul className="text-sm divide-y" style={{ borderColor: "var(--card-border)" }}>
            {repo.commits.map((c: any) => (
              <li key={c.sha} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a href={c.url} target="_blank" rel="noreferrer" className="text-sm hover:underline truncate block">{c.message}</a>
                  <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">{c.author} · {new Date(c.date).toLocaleString("ja-JP")}</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded shrink-0" style={{ background: "var(--hover)" }}>{c.sha}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {repo.files?.length > 0 ? (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Folder className="w-4 h-4" /> ファイル ({repo.fileCount})</h2>
          <RepoFileTree files={repo.files} fullName={repo.fullName} />
        </section>
      ) : null}

      {readmeHtml ? (
        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> README</h2>
          <article className="prose-md max-w-none" dangerouslySetInnerHTML={{ __html: readmeHtml }} />
        </section>
      ) : null}
    </div>
  );
}
