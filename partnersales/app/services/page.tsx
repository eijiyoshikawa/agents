import { getModel } from "@/lib/metrics";
import { yen, pct } from "@/lib/format";
import type { TierReward } from "@/lib/types";

function rewardLabel(r: TierReward | undefined): string {
  if (!r) return "—";
  return r.type === "percentage" ? pct(r.rate ?? 0) : yen(r.fixedAmount ?? 0);
}

export default async function ServicesPage() {
  const m = await getModel();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>サービス・報酬プラン</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          サービスごとに tier1〜tier3 の紹介報酬を設定します（最大3段目まで分配）。
        </p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {m.services.map((svc) => {
          const byTier = new Map(svc.rewards.map((r) => [r.tier, r]));
          return (
            <div key={svc.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {svc.name} {!svc.active && <span className="pill pill-amber">停止中</span>}
                  </div>
                  {svc.description && <div className="h-section" style={{ marginTop: 4, textTransform: "none", letterSpacing: 0 }}>{svc.description}</div>}
                </div>
                {svc.unitPrice && <div style={{ textAlign: "right" }}><div className="h-section">標準単価</div><div className="stat-num">{yen(svc.unitPrice)}</div></div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
                {([1, 2, 3] as const).map((t) => (
                  <div key={t} style={{ background: "var(--hover)", borderRadius: 8, padding: "10px 12px" }}>
                    <div className="h-section">tier{t}{t === 1 ? "（直接）" : `（${t - 1}段上）`}</div>
                    <div className="stat-num" style={{ fontSize: 18, marginTop: 4 }}>{rewardLabel(byTier.get(t))}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
