"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { yen } from "@/lib/format";
import { PAYOUT_THRESHOLD } from "@/lib/payout";
import {
  createDeal,
  markPayoutPaid,
  recordPayout,
  registerPartner,
  setDealStatus,
  type ActionResult,
} from "./actions";
import type { DealStatus } from "@/lib/types";

export interface AdminData {
  source: string;
  configured: boolean;
  services: { id: string; name: string }[];
  partners: { id: string; name: string; slug: string; referralCode: string; status: string }[];
  deals: { id: string; clientName: string; serviceName: string; introducer: string; amount: number; status: DealStatus; closedAt: string; isSelfDeal: boolean }[];
  payoutRows: { partnerId: string; name: string; confirmedTotal: number; paidOut: number; invoicedAmount: number; unsettled: number; phase: string }[];
  payouts: { id: string; name: string; amount: number; status: string; invoiceNo?: string; paidAt?: string }[];
}

const input: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid var(--card-border)",
  background: "var(--card)", color: "var(--fg)", fontSize: 13, width: "100%",
};
const phaseLabel: Record<string, string> = { below_threshold: "下限未満（繰越）", eligible: "請求書発行依頼", invoiced: "入金待ち" };
const phasePill: Record<string, string> = { below_threshold: "pill", eligible: "pill pill-brand", invoiced: "pill pill-amber" };
const tabs = ["成約", "支払い", "パートナー登録"] as const;
type Tab = (typeof tabs)[number];

export default function AdminClient({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>("成約");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function run(fn: () => Promise<ActionResult>) {
    setErr(null); setMsg(null);
    try {
      const r = await fn();
      if (r.ok) { setMsg(r.message); router.refresh(); }
      else setErr(r.message);
      return r;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return { ok: false, message: "error" } as ActionResult;
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>スタッフ管理</h1>
        <span className="pill">source: {data.source}</span>
      </div>

      {!data.configured && (
        <div className="pill pill-amber" style={{ alignSelf: "start" }}>
          <AlertTriangle size={12} /> Supabase 未設定のため書き込みは無効（seed 表示）。docs/RUNBOOK.md 参照
        </div>
      )}
      {msg && <div className="pill pill-brand" style={{ alignSelf: "start" }}>{msg}</div>}
      {err && <div className="pill pill-red" style={{ alignSelf: "start" }}>{err}</div>}

      <div style={{ display: "flex", gap: 6 }}>
        {tabs.map((t) => (
          <button key={t} className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "成約" && <DealsTab data={data} run={run} />}
      {tab === "支払い" && <PayoutTab data={data} run={run} />}
      {tab === "パートナー登録" && <RegisterTab run={run} disabled={!data.configured} />}
    </div>
  );
}

type RunFn = (fn: () => Promise<ActionResult>) => Promise<ActionResult>;

function DealsTab({ data, run }: { data: AdminData; run: RunFn }) {
  const disabled = !data.configured;
  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? "");
  const [partnerId, setPartnerId] = useState(data.partners[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<DealStatus>("pending");
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 10));
  const [isSelfDeal, setIsSelfDeal] = useState(false);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form className="card" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}
        onSubmit={(e) => { e.preventDefault(); run(() => createDeal({ serviceId, clientName, introducerPartnerId: partnerId, amount: Number(amount), status, closedAt, isSelfDeal })); }}>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">サービス</span>
          <select style={input} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">紹介パートナー（tier1）</span>
          <select style={input} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            {data.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">クライアント名</span>
          <input style={input} value={clientName} onChange={(e) => setClientName(e.target.value)} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">契約金額（円）</span>
          <input style={input} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">ステータス</span>
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value as DealStatus)}>
            <option value="pending">pending（見込み）</option>
            <option value="confirmed">confirmed（確定）</option>
            <option value="paid">paid（入金済み）</option>
          </select></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">成約日</span>
          <input style={input} type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} /></label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={isSelfDeal} onChange={(e) => setIsSelfDeal(e.target.checked)} /> 自己成約（tier1なし）</label>
        <button className="btn btn-primary" disabled={disabled} style={{ justifyContent: "center" }}>成約を登録</button>
      </form>

      <div className="card" style={{ padding: 0 }}>
        {data.deals.map((d, i) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? "1px solid var(--card-border)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.clientName} {d.isSelfDeal && <span className="pill pill-amber">自己</span>}</div>
              <div className="h-section">{d.serviceName} / 紹介: {d.introducer} / {d.closedAt}</div>
            </div>
            <div className="stat-num" style={{ fontSize: 13 }}>{yen(d.amount)}</div>
            <select style={{ ...input, width: 130 }} defaultValue={d.status} disabled={disabled}
              onChange={(e) => run(() => setDealStatus(d.id, e.target.value as DealStatus))}>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="paid">paid</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayoutTab({ data, run }: { data: AdminData; run: RunFn }) {
  const disabled = !data.configured;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>
        未精算が {yen(PAYOUT_THRESHOLD)} に達すると「請求書発行依頼」。紹介者の請求書受領で invoiced、振込完了で paid。支払いは弊社からの銀行振込のみ。
      </p>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr) 1.2fr", gap: 8, padding: "8px 14px" }} className="h-section">
          <span>パートナー</span><span>確定累計</span><span>振込済</span><span>請求中</span><span>未精算</span><span>状態 / 操作</span>
        </div>
        {data.payoutRows.filter((r) => r.confirmedTotal > 0 || r.paidOut > 0).map((r) => (
          <div key={r.partnerId} style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr) 1.2fr", gap: 8, alignItems: "center", padding: "8px 14px", borderTop: "1px solid var(--card-border)", fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <span className="stat-num">{yen(r.confirmedTotal)}</span>
            <span className="stat-num">{yen(r.paidOut)}</span>
            <span className="stat-num">{yen(r.invoicedAmount)}</span>
            <span className="stat-num">{yen(r.unsettled)}</span>
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span className={phasePill[r.phase]}>{phaseLabel[r.phase]}</span>
              {r.phase === "eligible" && (
                <button className="btn btn-ghost" disabled={disabled} style={{ padding: "2px 8px", fontSize: 11 }}
                  onClick={() => { const no = prompt("請求書番号（任意）") ?? undefined; run(() => recordPayout({ partnerId: r.partnerId, amount: r.unsettled, status: "invoiced", invoiceNo: no })); }}>
                  請求書受領
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="h-section" style={{ marginBottom: 6 }}>精算レコード</div>
        <div className="card" style={{ padding: 0 }}>
          {data.payouts.length === 0 && <div style={{ padding: 12, color: "var(--fg-muted)", fontSize: 13 }}>なし</div>}
          {data.payouts.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: i ? "1px solid var(--card-border)" : "none", fontSize: 13 }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
              <span className="stat-num">{yen(p.amount)}</span>
              <span className={p.status === "paid" ? "pill pill-brand" : "pill pill-amber"}>{p.status === "paid" ? `振込済 ${p.paidAt ?? ""}` : "入金待ち"}</span>
              {p.status !== "paid" && (
                <button className="btn btn-ghost" disabled={disabled} style={{ padding: "2px 8px", fontSize: 11 }}
                  onClick={() => run(() => markPayoutPaid(p.id))}>振込完了</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegisterTab({ run, disabled }: { run: RunFn; disabled: boolean }) {
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [referrerCode, setReferrerCode] = useState("");
  const [loginId, setLoginId] = useState("");
  const [detail, setDetail] = useState<Record<string, string> | null>(null);

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <form className="card" style={{ display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => registerPartner({ name, person, email, referrerCode, loginId }));
          if (r.ok && r.detail) setDetail(r.detail);
        }}>
        <p className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>
          アポ後にスタッフが登録します。事前発行済みのログインID（未割り当て）を割り当ててください。
        </p>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">会社名 *</span>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">担当者名</span>
          <input style={input} value={person} onChange={(e) => setPerson(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">メールアドレス</span>
          <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">紹介元の招待コード（任意）</span>
          <input style={input} value={referrerCode} onChange={(e) => setReferrerCode(e.target.value)} placeholder="ACME-7K3Q" /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">割り当てるログインID *</span>
          <input style={input} value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="LET-P-0001" required /></label>
        <button className="btn btn-primary" disabled={disabled} style={{ justifyContent: "center" }}>登録して認証情報を割り当て</button>
      </form>
      {detail && (
        <div className="card" style={{ display: "grid", gap: 6 }}>
          <div className="h-section">登録完了</div>
          {Object.entries(detail).map(([k, v]) => (
            <div key={k} style={{ fontSize: 13 }}><span className="h-section">{k}: </span><code>{v}</code></div>
          ))}
        </div>
      )}
    </div>
  );
}
