"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { yen } from "@/lib/format";
import { PAYOUT_THRESHOLD } from "@/lib/payout";
import {
  createDeal,
  deleteDeal,
  markPayoutPaid,
  recordPayout,
  registerPartner,
  reissuePassword,
  setDealStatus,
  syncAllPartnersNotion,
  syncPartnerNotion,
  type ActionResult,
} from "./actions";
import { saveRatePlan, deleteRatePlan } from "./rate-actions";
import type { DealStatus } from "@/lib/types";

type TierRow = { tier: number; type: "percentage" | "fixed"; value: number };

export interface AdminData {
  source: string;
  configured: boolean;
  services: { id: string; name: string; rewards: TierRow[] }[];
  ratePlans: { id: string; name: string; partnerIds: string[]; rewards: { serviceId: string; tier: number; type: "percentage" | "fixed"; value: number }[] }[];
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
const tierLabel = ["tier1（直接）", "tier2（1段上）"];
const tabs = ["成約", "支払い", "パートナー登録", "料率パターン"] as const;
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
      {tab === "パートナー登録" && <RegisterTab data={data} run={run} disabled={!data.configured} />}
      {tab === "料率パターン" && <RatePlansTab data={data} run={run} disabled={!data.configured} />}
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
            <button type="button" className="btn btn-ghost" disabled={disabled} style={{ padding: "6px 8px" }}
              title="この成約を削除"
              onClick={() => { if (confirm(`成約「${d.clientName}（${yen(d.amount)}）」を削除しますか？報酬も再計算されます。`)) run(() => deleteDeal(d.id)); }}>
              <Trash2 size={14} />
            </button>
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

function RegisterTab({ data, run, disabled }: { data: AdminData; run: RunFn; disabled: boolean }) {
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
          if (r.ok && r.detail) {
            setDetail(r.detail);
            setName(""); setPerson(""); setEmail(""); setReferrerCode(""); setLoginId("");
          }
        }}>
        <p className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>
          アポ後にスタッフが登録します。ログインID・パスワードは自動発行され、メールアドレス宛に送信されます。
        </p>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">会社名 *</span>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">担当者名</span>
          <input style={input} value={person} onChange={(e) => setPerson(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">メールアドレス（ログイン情報の送信先）</span>
          <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@example.com" /></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">紹介元（任意）</span>
          <select style={input} value={referrerCode} onChange={(e) => setReferrerCode(e.target.value)}>
            <option value="">（なし / ルート登録）</option>
            {data.partners.map((p) => (
              <option key={p.id} value={p.referralCode}>{p.name}（{p.referralCode}）</option>
            ))}
          </select></label>
        <label style={{ display: "grid", gap: 4 }}><span className="h-section">ログインID（空欄で自動発行）</span>
          <input style={input} value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="自動発行（例 LET-P-XXXXX）" /></label>
        <button className="btn btn-primary" disabled={disabled} style={{ justifyContent: "center" }}>登録してログイン情報を発行</button>
      </form>
      {detail && (
        <div className="card" style={{ display: "grid", gap: 6 }}>
          <div className="h-section">登録完了</div>
          {Object.entries(detail).map(([k, v]) => (
            <div key={k} style={{ fontSize: 13 }}><span className="h-section">{k}: </span><code>{v}</code></div>
          ))}
          {detail["パスワード"] && (
            <p className="pill pill-amber" style={{ alignSelf: "start" }}>メール未送信のため、上記パスワードを担当者へ手動でお伝えください</p>
          )}
        </div>
      )}

      <ReissueCard data={data} run={run} disabled={disabled} />
      <NotionSyncCard data={data} run={run} disabled={disabled} />
    </div>
  );
}

function NotionSyncCard({ data, run, disabled }: { data: AdminData; run: RunFn; disabled: boolean }) {
  const [partnerId, setPartnerId] = useState(data.partners[0]?.id ?? "");
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div className="h-section">Notion 同期（DB_協業先管理）</div>
      <p style={{ color: "var(--fg-muted)", fontSize: 12, margin: 0 }}>
        新規登録は自動同期されます。既存パートナーはここで同期/再同期できます（要 NOTION_TOKEN）。
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <select style={{ ...input, flex: 1 }} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          {data.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-ghost" disabled={disabled || !partnerId} onClick={() => run(() => syncPartnerNotion(partnerId))}>
          このパートナーを同期
        </button>
      </div>
      <button className="btn btn-ghost" disabled={disabled} style={{ justifySelf: "start" }}
        onClick={() => { if (confirm("全パートナーを Notion へ同期します。よろしいですか？")) run(() => syncAllPartnersNotion()); }}>
        全パートナーを一括同期
      </button>
    </div>
  );
}

function ReissueCard({ data, run, disabled }: { data: AdminData; run: RunFn; disabled: boolean }) {
  const [partnerId, setPartnerId] = useState(data.partners[0]?.id ?? "");
  const [detail, setDetail] = useState<Record<string, string> | null>(null);

  return (
    <form className="card" style={{ display: "grid", gap: 10 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!confirm("選択したパートナーのパスワードを再発行します。現在のパスワードは使えなくなります。よろしいですか？")) return;
        const r = await run(() => reissuePassword(partnerId));
        if (r.ok && r.detail) setDetail(r.detail); else setDetail(null);
      }}>
      <div className="h-section">パスワードの再発行（忘失・漏洩時）</div>
      <p style={{ color: "var(--fg-muted)", fontSize: 12, margin: 0 }}>
        新しいパスワードを発行し、登録メールへ送信します（メール未設定時は下に表示）。
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <select style={{ ...input, flex: 1 }} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          {data.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-ghost" disabled={disabled || !partnerId}>再発行</button>
      </div>
      {detail && (
        <div style={{ display: "grid", gap: 4, borderTop: "1px solid var(--card-border)", paddingTop: 8 }}>
          {Object.entries(detail).map(([k, v]) => (
            <div key={k} style={{ fontSize: 13 }}><span className="h-section">{k}: </span><code>{v}</code></div>
          ))}
        </div>
      )}
    </form>
  );
}

function RatePlansTab({ data, run, disabled }: { data: AdminData; run: RunFn; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>
        紹介者ごとに適用する料率を設定できます。成約時に、その紹介者のパターン（無ければサービス既定）が料率として記録されます。
      </p>
      {data.ratePlans.map((p) => (
        // サーバ状態が変わったら再マウントして編集フォームを最新に同期（割り当ての取り違え防止）
        <RatePlanEditor key={JSON.stringify(p)} data={data} plan={p} run={run} disabled={disabled} isNew={false} />
      ))}
      <RatePlanEditor data={data} plan={null} run={run} disabled={disabled} isNew />
    </div>
  );
}

function RatePlanEditor({
  data, plan, run, disabled, isNew,
}: {
  data: AdminData;
  plan: AdminData["ratePlans"][number] | null;
  run: RunFn; disabled: boolean; isNew: boolean;
}) {
  const buildRewards = (): Record<string, TierRow[]> => {
    const map: Record<string, TierRow[]> = {};
    for (const s of data.services) {
      map[s.id] = [1, 2].map((t) => {
        const fromPlan = plan?.rewards.find((r) => r.serviceId === s.id && r.tier === t);
        const def = s.rewards.find((r) => r.tier === t);
        const src = fromPlan ?? def;
        return { tier: t, type: src?.type ?? "percentage", value: src?.value ?? 0 };
      });
    }
    return map;
  };
  const [name, setName] = useState(plan?.name ?? "");
  const [rewards, setRewards] = useState<Record<string, TierRow[]>>(buildRewards);
  const [partnerIds, setPartnerIds] = useState<string[]>(plan?.partnerIds ?? []);

  const setR = (serviceId: string, tier: number, patch: Partial<TierRow>) =>
    setRewards((m) => ({ ...m, [serviceId]: m[serviceId].map((r) => (r.tier === tier ? { ...r, ...patch } : r)) }));
  const togglePartner = (id: string) =>
    setPartnerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <form className="card" style={{ display: "grid", gap: 12, borderStyle: isNew ? "dashed" : "solid" }}
      onSubmit={(e) => {
        e.preventDefault();
        const flat = Object.entries(rewards).flatMap(([serviceId, rows]) =>
          rows.map((r) => ({ serviceId, tier: r.tier, type: r.type, value: r.value })));
        run(() => saveRatePlan({ id: isNew ? undefined : plan!.id, name, rewards: flat, partnerIds }));
        if (isNew) { setName(""); setPartnerIds([]); setRewards(buildRewards()); }
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 15 }}>{isNew ? "＋ 新規料率パターン" : plan!.name}</strong>
        {!isNew && <span className="pill">{partnerIds.length}名に適用</span>}
      </div>
      <label style={{ display: "grid", gap: 4 }}><span className="h-section">パターン名 *</span>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} required /></label>

      {data.services.map((s) => (
        <div key={s.id} style={{ border: "1px solid var(--card-border)", borderRadius: 8, padding: 10 }}>
          <div className="h-section" style={{ marginBottom: 6 }}>{s.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {rewards[s.id]?.map((r, i) => (
              <div key={r.tier} style={{ display: "grid", gap: 4 }}>
                <span className="h-section">{tierLabel[i]}</span>
                <select style={input} value={r.type} onChange={(e) => setR(s.id, r.tier, { type: e.target.value as TierRow["type"] })}>
                  <option value="percentage">％</option><option value="fixed">円</option>
                </select>
                <input style={input} type="number" min={0} value={r.value} onChange={(e) => setR(s.id, r.tier, { value: Number(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div className="h-section" style={{ marginBottom: 6 }}>適用する紹介者</div>
        {data.partners.length === 0 && <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>パートナーがいません</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 180, overflow: "auto" }}>
          {data.partners.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13, border: "1px solid var(--card-border)", borderRadius: 6, padding: "4px 8px" }}>
              <input type="checkbox" checked={partnerIds.includes(p.id)} onChange={() => togglePartner(p.id)} /> {p.name}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" disabled={disabled} style={{ marginLeft: "auto" }}>{isNew ? "作成" : "保存"}</button>
        {!isNew && (
          <button type="button" className="btn btn-ghost" disabled={disabled}
            onClick={() => { if (confirm(`「${plan!.name}」を削除しますか？`)) run(() => deleteRatePlan(plan!.id)); }}>
            <Trash2 size={14} /> 削除
          </button>
        )}
      </div>
    </form>
  );
}
