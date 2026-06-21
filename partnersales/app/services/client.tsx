"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { yen } from "@/lib/format";
import { deleteService, saveService, type ServiceActionResult } from "./actions";

export interface RewardRow {
  tier: number;
  type: "percentage" | "fixed";
  value: number;
}
export interface ServiceRow {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
  rewards: RewardRow[];
}

const input: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--card-border)",
  background: "var(--card)", color: "var(--fg)", fontSize: 13, width: "100%",
};
const tierLabel = ["tier1（直接）", "tier2（1段上）", "tier3（2段上）"];

const emptyService = (): ServiceRow => ({
  id: "", name: "", description: "", unitPrice: 0, active: true,
  rewards: [1, 2, 3].map((tier) => ({ tier, type: "percentage", value: 0 })),
});

export default function ServicesClient({ services, configured }: { services: ServiceRow[]; configured: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function run(fn: () => Promise<ServiceActionResult>) {
    setMsg(null); setErr(null);
    try {
      const r = await fn();
      if (r.ok) { setMsg(r.message); router.refresh(); }
      else setErr(r.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>サービス・報酬プラン</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          サービスごとに tier1〜tier3 の紹介報酬を設定します（最大3段目まで分配）。編集して「保存」を押すと反映されます。
        </p>
      </div>

      {!configured && (
        <div className="pill pill-amber" style={{ alignSelf: "start" }}>
          <AlertTriangle size={12} /> Supabase 未設定のため保存は無効（seed 表示）
        </div>
      )}
      {msg && <div className="pill pill-brand" style={{ alignSelf: "start" }}>{msg}</div>}
      {err && <div className="pill pill-red" style={{ alignSelf: "start" }}>{err}</div>}

      {services.map((s) => (
        <ServiceEditor key={s.id} initial={s} disabled={!configured} run={run} isNew={false} />
      ))}

      <ServiceEditor initial={emptyService()} disabled={!configured} run={run} isNew />
    </div>
  );
}

function ServiceEditor({
  initial, disabled, run, isNew,
}: {
  initial: ServiceRow; disabled: boolean; isNew: boolean;
  run: (fn: () => Promise<ServiceActionResult>) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [unitPrice, setUnitPrice] = useState(String(initial.unitPrice || ""));
  const [active, setActive] = useState(initial.active);
  const [rewards, setRewards] = useState<RewardRow[]>(initial.rewards);

  function setReward(tier: number, patch: Partial<RewardRow>) {
    setRewards((rs) => rs.map((r) => (r.tier === tier ? { ...r, ...patch } : r)));
  }

  return (
    <form
      className="card"
      style={{ display: "grid", gap: 12, borderStyle: isNew ? "dashed" : "solid" }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveService({
          id: isNew ? undefined : initial.id,
          name, description, unitPrice: Number(unitPrice) || 0, active, rewards,
        }));
        if (isNew) { setName(""); setDescription(""); setUnitPrice(""); setActive(true); setRewards(emptyService().rewards); }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 15 }}>{isNew ? "＋ 新規サービスを追加" : initial.name}</strong>
        {!isNew && <span className="pill">{initial.id}</span>}
        {!isNew && !initial.active && <span className="pill pill-amber">停止中</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">サービス名 *</span>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">標準単価（円）</span>
          <input style={input} type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></label>
      </div>
      <label style={{ display: "grid", gap: 4 }}><span className="h-section">説明</span>
        <input style={input} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {rewards.map((r, i) => (
          <div key={r.tier} style={{ background: "var(--hover)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 6 }}>
            <div className="h-section">{tierLabel[i]}</div>
            <select style={input} value={r.type} onChange={(e) => setReward(r.tier, { type: e.target.value as RewardRow["type"] })}>
              <option value="percentage">％（割合）</option>
              <option value="fixed">円（固定）</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input style={input} type="number" min={0} step={r.type === "percentage" ? 0.1 : 1000}
                value={r.value} onChange={(e) => setReward(r.tier, { value: Number(e.target.value) })} />
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{r.type === "percentage" ? "%" : "円"}</span>
            </div>
            {r.type === "percentage" && initial.unitPrice > 0 && (
              <span className="h-section">標準単価で {yen(Math.floor(initial.unitPrice * (r.value / 100)))}</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> 有効
        </label>
        <button className="btn btn-primary" disabled={disabled} style={{ marginLeft: "auto" }}>
          {isNew ? <><Plus size={14} /> 追加</> : "保存"}
        </button>
        {!isNew && (
          <button type="button" className="btn btn-ghost" disabled={disabled}
            onClick={() => { if (confirm(`「${initial.name}」を削除しますか？`)) run(() => deleteService(initial.id)); }}>
            <Trash2 size={14} /> 削除
          </button>
        )}
      </div>
    </form>
  );
}
