import { getPipelineCustomers } from "@/lib/data";
import type { ListCustomer } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STAGES: { key: string; color: string }[] = [
  { key: "アポイント獲得", color: "#F472B6" },
  { key: "提案中", color: "#A78BFA" },
  { key: "商談中", color: "#38BDF8" },
  { key: "契約中", color: "#2DD4BF" },
];

export default async function PipelinePage() {
  const { customers, errors } = await getPipelineCustomers();
  const byStage: Record<string, ListCustomer[]> = {};
  for (const s of STAGES) byStage[s.key] = [];
  for (const c of customers) if (c.status && byStage[c.status]) byStage[c.status].push(c);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">商談パイプライン</h1>
        <p className="text-xs text-ink-muted mt-0.5">アポ獲得〜契約中の進行中案件をステージ別に表示。</p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((s) => (
          <div key={s.key} className="card p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-semibold text-ink flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.key}
              </span>
              <span className="text-xs text-ink-muted">{byStage[s.key].length}</span>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {byStage[s.key].length === 0 && <p className="text-xs text-ink-muted px-1 py-2">なし</p>}
              {byStage[s.key].map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-2.5 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="text-sm text-ink font-medium truncate">{c.name}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {[c.sRep ?? c.isRep, c.industry, c.appointmentDate?.slice(0, 10)].filter(Boolean).join(" ・ ")}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
