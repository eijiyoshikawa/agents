import Link from "next/link";
import { FileText, ArrowUpRight } from "lucide-react";
import { getTemplates } from "@/lib/data";

const ICONS: Record<string, string> = {
  "proposal-bpo": "📄",
  "subsidy": "🏛",
  "marketing-plan": "📈",
  "report-builder": "🎞",
  "seo-audit": "🔍",
};

export default function DocumentsIndex() {
  const templates = getTemplates();
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">書類作成</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">テンプレートを選んで生成</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">フォームに入力すると、担当エージェント向けのブリーフが自動生成されます。</p>
      </header>
      <div className="grid md:grid-cols-2 gap-3">
        {templates.map((t, i) => (
          <Link key={t.id} href={`/documents/new/${t.id}`} className="card card-hover group relative overflow-hidden animate-growFromBottom" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br from-brand-glow to-accent-indigo opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="flex items-center justify-between relative">
              <div className="text-3xl">{ICONS[t.id] ?? "📋"}</div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="pill mt-3 inline-flex">{t.output}</div>
            <h2 className="text-lg font-semibold mt-2 group-hover:text-brand-glow transition">{t.title}</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-1.5 line-clamp-2">{t.description}</p>
            <div className="text-xs text-[var(--fg-muted)] mt-3">担当: <span className="font-mono">{t.agent}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
