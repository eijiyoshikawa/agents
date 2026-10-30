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
      className="card group relative flex flex-col overflow-hidden p-5 animate-grow-from-bottom motion-reduce:animate-none hover:-translate-y-0.5 hover:border-line-2 hover:shadow-lg transition-all duration-300 ease-standard"
      // 登場の時間差は最大 0.2 秒まで（件数が多いと最後のカードが出るまで 1 秒近く待たされていた）
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${sso.dot} opacity-80`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <h3 className="text-base font-semibold leading-snug text-ink">{d.title}</h3>
        <span className="text-brand-ink transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </div>
      <p className="mt-2 pl-2 text-sm leading-relaxed text-ink-2">{d.desc}</p>
      {/* タグの行はカードの下端に揃える（同じ段のカードで高さがずれないように） */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pl-2 pt-4">
        <span className={`chip ${sso.cls}`}>{sso.text}</span>
        <span className="chip chip-muted">{ROLE_LABEL[d.minRole]}以上</span>
      </div>
      {/* 出どころは常に別の行（タグの横に入ったり折り返したりで、カードごとに位置がずれないように） */}
      <div className="mt-2 pl-2 text-right text-[11px] leading-4 text-ink-3 [overflow-wrap:anywhere]">{d.source}</div>
    </a>
  );
}
