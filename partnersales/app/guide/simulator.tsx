"use client";
import { useMemo, useState } from "react";
import Counter from "@/components/Counter";
import { yen } from "@/lib/format";

export interface SimReward {
  tier: number;
  type: "percentage" | "fixed";
  rate: number;
  fixedAmount: number;
}
export interface SimService {
  id: string;
  name: string;
  unitPrice: number;
  agency: SimReward[];
  tossup: SimReward[];
}

const tierLabel: Record<number, string> = {
  1: "あなたが直接クライアントを紹介",
  2: "あなたの紹介先（1段下）が成約",
};

function rewardAmount(r: SimReward | undefined, amount: number): number {
  if (!r) return 0;
  return r.type === "percentage" ? Math.floor(amount * (r.rate || 0)) : r.fixedAmount || 0;
}
function rateLabel(r: SimReward | undefined): string {
  if (!r) return "—";
  return r.type === "percentage" ? `${Math.round((r.rate || 0) * 1000) / 10}%` : yen(r.fixedAmount || 0);
}

const input: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--card-border)",
  background: "var(--card)", color: "var(--fg)", fontSize: 14, width: "100%",
};

export default function Simulator({ services }: { services: SimService[] }) {
  const [sid, setSid] = useState(services[0]?.id ?? "");
  const [planType, setPlanType] = useState<"agency" | "tossup">("agency");
  const svc = services.find((s) => s.id === sid);
  const [amount, setAmount] = useState(String(svc?.unitPrice || 1000000));
  const amt = Number(amount) || 0;
  const rewards = planType === "tossup" ? svc?.tossup : svc?.agency;
  const tiers = useMemo(() => [1, 2].map((t) => rewards?.find((r) => r.tier === t)), [rewards]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}><span className="h-section">サービス</span>
            <select style={input} value={sid} onChange={(e) => { setSid(e.target.value); const ns = services.find((s) => s.id === e.target.value); if (ns?.unitPrice) setAmount(String(ns.unitPrice)); }}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}><span className="h-section">報酬区分</span>
            <select style={input} value={planType} onChange={(e) => setPlanType(e.target.value as "agency" | "tossup")}>
              <option value="agency">代理店</option>
              <option value="tossup">トスアップ</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}><span className="h-section">契約金額（円）</span>
            <input style={input} type="number" min={0} step={10000} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[1, 2].map((t, i) => (
            <div key={t} style={{ background: "var(--hover)", borderRadius: 10, padding: "14px 16px" }}>
              <div className="h-section">tier{t}・{rateLabel(tiers[i])}</div>
              <div style={{ fontSize: 24, marginTop: 6 }}>
                <Counter value={rewardAmount(tiers[i], amt)} prefix="¥" />
              </div>
              <div className="h-section" style={{ marginTop: 6, textTransform: "none", letterSpacing: 0 }}>{tierLabel[t]}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--fg-muted)", fontSize: 12, margin: 0 }}>
          ※ 標準レートでの試算です。特別料率が適用されている場合や、上位の紹介者構成により実際の金額は変わることがあります。
        </p>
      </div>

      <div>
        <div className="h-section" style={{ marginBottom: 8 }}>
          サービス別 報酬早見表（標準単価・{planType === "tossup" ? "トスアップ" : "代理店"}）
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 8, padding: "10px 14px" }} className="h-section">
            <span>サービス（標準単価）</span><span>tier1</span><span>tier2</span>
          </div>
          {services.map((s) => {
            const rows = planType === "tossup" ? s.tossup : s.agency;
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--card-border)", fontSize: 13 }}>
                <span><strong>{s.name}</strong><br /><span className="h-section">{yen(s.unitPrice)}</span></span>
                {[1, 2].map((t) => {
                  const r = rows.find((x) => x.tier === t);
                  return <span key={t} className="stat-num">{yen(rewardAmount(r, s.unitPrice))}</span>;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
