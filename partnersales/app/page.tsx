import Link from "next/link";
import { TrendingUp, LifeBuoy, Network } from "lucide-react";
import { getModel } from "@/lib/metrics";
import { yen } from "@/lib/format";
import TreeView from "@/components/TreeView";

export default function Dashboard() {
  const m = getModel();

  const totalConfirmed = [...m.earnings.values()].reduce((a, e) => a + e.confirmed, 0);
  const totalPending = [...m.earnings.values()].reduce((a, e) => a + e.pending, 0);
  const totalSales = m.deals.reduce((a, d) => a + d.amount, 0);

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <section>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>自社管理ダッシュボード</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          全パートナーの紹介ツリー・成績・重点サポート対象を俯瞰します。
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[
          { label: "総売上", value: yen(totalSales) },
          { label: "確定報酬", value: yen(totalConfirmed) },
          { label: "見込み報酬", value: yen(totalPending) },
          { label: "パートナー数", value: String(m.partners.length) },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="h-section">{s.label}</div>
            <div className="stat-num" style={{ fontSize: 24, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} /> リーダーボード
          </h2>
          <div className="card" style={{ padding: 0 }}>
            {m.leaderboard.map((s, i) => (
              <div key={s.partner.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid var(--card-border)" : "none" }}>
                <span className="stat-num" style={{ width: 22, color: i < 3 ? "var(--accent)" : "var(--fg-muted)" }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/partners/${s.partner.slug}`} style={{ fontWeight: 600, fontSize: 14 }}>{s.partner.name}</Link>
                  <div className="h-section">直 {s.directReferrals} / 配下 {s.downlineCount}名</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="stat-num" style={{ fontSize: 14 }}>{yen(s.totalSales)}</div>
                  <div className="h-section">報酬 {yen(s.commissionEarned)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <LifeBuoy size={16} /> 重点サポート候補
          </h2>
          <div className="card" style={{ padding: 0 }}>
            {m.supportQueue.length === 0 && <div style={{ padding: 14, color: "var(--fg-muted)", fontSize: 13 }}>対象なし</div>}
            {m.supportQueue.map((s, i) => (
              <div key={s.partner.id} style={{ padding: "10px 14px", borderTop: i ? "1px solid var(--card-border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pill pill-amber">優先度 {s.supportPriority}</span>
                  <Link href={`/partners/${s.partner.slug}`} style={{ fontWeight: 600, fontSize: 14 }}>{s.partner.name}</Link>
                </div>
                <div className="h-section" style={{ marginTop: 4 }}>{s.supportReasons.join(" / ")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Network size={16} /> 全体紹介ツリー
        </h2>
        <TreeView roots={m.forest} metrics={m.metrics} />
      </section>
    </div>
  );
}
