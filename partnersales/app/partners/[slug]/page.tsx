import Link from "next/link";
import { notFound } from "next/navigation";
import { getModel, statsFor } from "@/lib/metrics";
import { yen } from "@/lib/format";
import { buildTree } from "@/lib/tree";
import { PAYOUT_METHOD, PAYOUT_THRESHOLD } from "@/lib/payout";
import TreeView from "@/components/TreeView";

export async function generateStaticParams() {
  const m = await getModel();
  return m.partners.map((p) => ({ slug: p.slug }));
}

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await getModel();
  const partner = m.partners.find((p) => p.slug === slug);
  if (!partner) notFound();

  const stat = statsFor(m.stats, partner.id);
  const earn = m.earnings.get(partner.id);
  const payout = m.payoutStates.get(partner.id);
  const subtree = buildTree(m.partners, partner.id);
  const myDeals = m.deals.filter((d) => d.introducerPartnerId === partner.id);
  const serviceName = (id: string) => m.services.find((s) => s.id === id)?.name ?? id;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link href="/" className="h-section">← ダッシュボード</Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{partner.name}</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          招待コード <code>{partner.referralCode}</code>
          {partner.contact?.person && <> ・ 担当 {partner.contact.person}</>}
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {[
          { label: "自身＋配下 総売上", value: yen(stat?.totalSales ?? 0) },
          { label: "確定報酬", value: yen(earn?.confirmed ?? 0) },
          { label: "見込み報酬", value: yen(earn?.pending ?? 0) },
          { label: "ダウンライン", value: `${stat?.downlineCount ?? 0}名` },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="h-section">{s.label}</div>
            <div className="stat-num" style={{ fontSize: 22, marginTop: 6 }}>{s.value}</div>
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
          <div><div className="h-section">未精算（支払い対象）</div><div className="stat-num" style={{ fontSize: 18 }}>{yen(payout?.unsettled ?? 0)}</div></div>
          <div><div className="h-section">振込済み累計</div><div className="stat-num" style={{ fontSize: 18 }}>{yen(payout?.paidOut ?? 0)}</div></div>
          <div><div className="h-section">支払い下限</div><div className="stat-num" style={{ fontSize: 18 }}>{yen(PAYOUT_THRESHOLD)}</div></div>
        </div>
        <p style={{ color: "var(--fg-muted)", fontSize: 12, margin: 0 }}>
          累計確定報酬が {yen(PAYOUT_THRESHOLD)} に達するまでは支払われません（繰越）。
          支払いは{PAYOUT_METHOD}。
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
          <div className="h-section" style={{ marginBottom: 8 }}>あなたが紹介した成約</div>
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

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>あなたの紹介ツリー</h2>
        <TreeView roots={subtree} metrics={m.metrics} />
      </section>
    </div>
  );
}
