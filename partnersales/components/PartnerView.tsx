// パートナーの詳細ビュー（/me と /partners/[slug] で共用）。
import Link from "next/link";
import { yen } from "@/lib/format";
import { buildTree } from "@/lib/tree";
import { statsFor } from "@/lib/metrics";
import { PAYOUT_METHOD, PAYOUT_THRESHOLD } from "@/lib/payout";
import { monthlyTotals, statementForPartner } from "@/lib/statement";
import TreeView from "@/components/TreeView";
import Counter from "@/components/Counter";
import type { getModel } from "@/lib/metrics";
import type { Partner } from "@/lib/types";

type Model = Awaited<ReturnType<typeof getModel>>;

export default function PartnerView({
  model,
  partner,
  staffView = false,
}: {
  model: Model;
  partner: Partner;
  /** スタッフが他社を閲覧している場合 true（戻り先や文言を切替） */
  staffView?: boolean;
}) {
  const m = model;
  const stat = statsFor(m.stats, partner.id);
  const earn = m.earnings.get(partner.id);
  const payout = m.payoutStates.get(partner.id);
  const subtree = buildTree(m.partners, partner.id);
  const myDeals = m.deals.filter((d) => d.introducerPartnerId === partner.id);
  const serviceName = (id: string) => m.services.find((s) => s.id === id)?.name ?? id;
  const lines = statementForPartner(partner.id, m.commissions, m.deals, m.services);
  const months = monthlyTotals(lines);
  const you = staffView ? "" : "あなたの";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        {staffView && <Link href="/" className="h-section">← ダッシュボード</Link>}
        <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{partner.name}</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          招待コード <code>{partner.referralCode}</code>
          {partner.contact?.person && <> ・ 担当 {partner.contact.person}</>}
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {[
          { label: "自身＋配下 総売上", value: stat?.totalSales ?? 0, prefix: "¥", suffix: "" },
          { label: "確定報酬", value: earn?.confirmed ?? 0, prefix: "¥", suffix: "" },
          { label: "見込み報酬", value: earn?.pending ?? 0, prefix: "¥", suffix: "" },
          { label: "ダウンライン", value: stat?.downlineCount ?? 0, prefix: "", suffix: "名" },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="h-section">{s.label}</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>
              <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
            </div>
          </div>
        ))}
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="h-section">支払い状況</div>
          {payout && (
            <span className={payout.phase === "eligible" ? "pill pill-brand" : payout.phase === "invoiced" ? "pill pill-amber" : "pill"}>
              {payout.phase === "eligible" ? "請求書発行をご依頼します" : payout.phase === "invoiced" ? "入金待ち" : "支払い下限未満（繰越）"}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          <div><div className="h-section">未精算（支払い対象）</div><div style={{ fontSize: 18 }}><Counter value={payout?.unsettled ?? 0} prefix="¥" /></div></div>
          <div><div className="h-section">振込済み累計</div><div style={{ fontSize: 18 }}><Counter value={payout?.paidOut ?? 0} prefix="¥" /></div></div>
          <div><div className="h-section">支払い下限</div><div className="stat-num" style={{ fontSize: 18 }}>{yen(PAYOUT_THRESHOLD)}</div></div>
        </div>
        <p style={{ color: "var(--fg-muted)", fontSize: 12, margin: 0 }}>
          累計確定報酬が {yen(PAYOUT_THRESHOLD)} に達するまでは支払われません（繰越）。支払いは{PAYOUT_METHOD}。
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="h-section" style={{ marginBottom: 8 }}>段別 確定報酬内訳</div>
          {([1, 2, 3] as const).map((t) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--card-border)" }}>
              <span>tier{t}（{t === 1 ? "クライアント直接紹介" : `${t - 1}段下からの成約`}）</span>
              <span className="stat-num">{yen(earn?.byTier[t] ?? 0)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="h-section" style={{ marginBottom: 8 }}>{you ? `${you}紹介した成約` : "紹介した成約"}</div>
          {myDeals.length === 0 && <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>成約なし</div>}
          {myDeals.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--card-border)" }}>
              <span>
                {d.clientName} <span className="pill">{d.status}</span>
                {d.isSelfDeal && <span className="pill pill-amber" style={{ marginLeft: 4 }}>自己成約</span>}
                <span className="h-section" style={{ display: "block", textTransform: "none", letterSpacing: 0 }}>{serviceName(d.serviceId)}</span>
              </span>
              <span className="stat-num">{yen(d.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="h-section" style={{ marginBottom: 8 }}>報酬明細</div>
          {lines.length === 0 && <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>明細なし</div>}
          {lines.map((l, i) => (
            <div key={`${l.dealId}-${l.tier}-${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--card-border)", fontSize: 13 }}>
              <span>
                <span className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>{l.month}</span>{" "}
                {l.clientName} <span className="pill">tier{l.tier}</span>
                {l.status === "accrued" && <span className="pill pill-amber" style={{ marginLeft: 4 }}>見込み</span>}
              </span>
              <span className="stat-num">{yen(l.amount)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="h-section" style={{ marginBottom: 8 }}>月次締め（確定報酬）</div>
          {months.length === 0 && <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>確定報酬なし</div>}
          {months.map((mo) => (
            <div key={mo.month} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--card-border)" }}>
              <span>{mo.month}</span>
              <span className="stat-num">{yen(mo.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{you ? `${you}紹介ツリー` : "紹介ツリー"}</h2>
        <TreeView roots={subtree} metrics={m.metrics} linkPartners={staffView} />
      </section>
    </div>
  );
}
