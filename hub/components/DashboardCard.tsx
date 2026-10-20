import type { Dashboard } from "@/lib/dashboards";
import { ROLE_LABEL } from "@/lib/roles";

const SSO_LABEL: Record<Dashboard["sso"], { text: string; cls: string; dot: string }> = {
  ready: { text: "共通ログイン対応", cls: "chip-good", dot: "bg-good" },
  planned: { text: "個別ログイン（統合予定）", cls: "chip-watch", dot: "bg-watch" },
  "link-only": { text: "リンクのみ", cls: "chip-muted", dot: "bg-ink-3" },
};

export function DashboardCard({ d, index }: { d: Dashboard; index: number }) {
  const sso = SSO_LABEL[d.sso];
  return (
    <a
      href={d.url}
      className="card group relative block overflow-hidden p-5 animate-grow-from-bottom motion-reduce:animate-none hover:-translate-y-0.5 hover:border-line-2 hover:shadow-lg transition-all duration-300 ease-standard"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${sso.dot} opacity-80`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <h3 className="text-base font-semibold leading-snug text-ink">{d.title}</h3>
        <span className="text-brand-ink transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </div>
      <p className="mt-2 pl-2 text-sm leading-relaxed text-ink-2">{d.desc}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 pl-2">
        <span className={`chip ${sso.cls}`}>{sso.text}</span>
        <span className="chip chip-muted">{ROLE_LABEL[d.minRole]}以上</span>
        <span className="ml-auto text-[11px] text-ink-3">{d.source}</span>
      </div>
    </a>
  );
}
