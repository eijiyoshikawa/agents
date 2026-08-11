import Link from "next/link";
import { ExternalLink, GitBranch, Star, AlertCircle, Lock, Globe, RefreshCw, AlertTriangle } from "lucide-react";
import reposData from "@/data/repos.json";

const COLOR_MAP: Record<string, string> = {
  brand: "pill-brand",
  indigo: "pill-indigo",
  amber: "pill-amber",
  violet: "pill-violet",
  teal: "pill-teal",
};

export default function ReposPage() {
  const data = reposData as any;
  const items = data.items ?? [];
  const categories = data.categories ?? {};

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">リポジトリ</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">クロスリポ参照は未設定です</p>
        </header>
        <div className="card bg-mesh">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-accent-amber" />
            <span className="h-section">セットアップ未完了</span>
          </div>
          <h2 className="font-semibold">{data.reason ?? "GITHUB_TOKEN が未設定です"}</h2>
          <ol className="text-sm text-[var(--fg-soft)] mt-4 space-y-2.5 list-decimal pl-5">
            <li>GitHub の Settings → Developer settings → <strong>Personal access tokens (fine-grained)</strong> でトークンを発行（権限: <code className="text-xs">Contents: Read-only</code>, <code className="text-xs">Metadata: Read-only</code>）</li>
            <li>Vercel のプロジェクト設定（または <code className="text-xs">.env.local</code> / GitHub Actions の Secret）に <code className="text-xs">GITHUB_TOKEN</code> として保存</li>
            <li><code className="text-xs">console/config/repos.json</code> の <code className="text-xs">REPLACE_REPO_*</code> を実在のリポ名に書き換え</li>
            <li><code className="text-xs">npm run scan</code> を再実行 → ビルド</li>
          </ol>
        </div>
      </div>
    );
  }

  const byCategory: Record<string, any[]> = {};
  items.forEach((r: any) => { (byCategory[r.category || "other"] ??= []).push(r); });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-[var(--fg-muted)]" />
            <span className="h-section">クロスリポ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">リポジトリ</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{items.length} リポジトリを横断参照</p>
        </div>
        <div className="text-xs text-[var(--fg-muted)] flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          最終同期: {data.generatedAt ? new Date(data.generatedAt).toLocaleString("ja-JP") : "—"}
        </div>
      </header>

      {Object.entries(byCategory).map(([cat, list]) => {
        const c = categories[cat] ?? { label: cat, color: "muted" };
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold">{c.label}</h2>
              <span className="text-xs text-[var(--fg-muted)]">{list.length}</span>
              <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/repos/${r.id}`}
                  className="card card-hover group relative overflow-hidden animate-growFromBottom"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-glow to-accent-indigo opacity-60`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {r.repoMeta?.private ? <Lock className="w-3 h-3 text-[var(--fg-muted)]" /> : <Globe className="w-3 h-3 text-[var(--fg-muted)]" />}
                        <span className={`pill ${COLOR_MAP[c.color] ?? ""} text-[10px]`}>{c.label}</span>
                      </div>
                      <div className="text-base font-semibold mt-2 truncate group-hover:text-brand-glow transition">{r.label}</div>
                      <div className="text-[11px] text-[var(--fg-muted)] font-mono mt-0.5 truncate">{r.fullName}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  {r.description ? <p className="text-xs text-[var(--fg-soft)] mt-2 line-clamp-2">{r.description}</p> : null}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--fg-muted)] mt-3">
                    {r.repoMeta?.language ? <span className="pill text-[10px]">{r.repoMeta.language}</span> : null}
                    <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" /> {r.repoMeta?.stars ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {r.repoMeta?.openIssues ?? 0}</span>
                    <span>📄 {r.fileCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
