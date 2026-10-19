import type { Dashboard } from "@/lib/dashboards";
import { ROLE_LABEL } from "@/lib/roles";

const SSO_LABEL: Record<Dashboard["sso"], { text: string; cls: string }> = {
  ready: { text: "共通ログイン対応", cls: "bg-emerald-100 text-emerald-800" },
  planned: { text: "個別ログイン（統合予定）", cls: "bg-amber-100 text-amber-800" },
  "link-only": { text: "リンクのみ", cls: "bg-ink/5 text-ink/60" },
};

export function DashboardCard({ d, index }: { d: Dashboard; index: number }) {
  const sso = SSO_LABEL[d.sso];
  return (
    <a
      href={d.url}
      className="card group block p-5 animate-grow-from-bottom motion-reduce:animate-none hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ease-standard"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-lg leading-snug">{d.title}</h2>
        <span className="text-brand transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </div>
      <p className="mt-2 text-sm text-ink/70 leading-relaxed">{d.desc}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`chip ${sso.cls}`}>{sso.text}</span>
        <span className="chip bg-ink/5 text-ink/60">{ROLE_LABEL[d.minRole]}以上</span>
        <span className="ml-auto text-[11px] text-ink/40">{d.source}</span>
      </div>
    </a>
  );
}
