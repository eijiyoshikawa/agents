"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import type { TreeNode } from "@/lib/tree";
import { yen } from "@/lib/format";

export interface NodeMetric {
  totalSales: number;
  confirmed: number;
  pending: number;
  directReferrals: number;
}

const tierTint = ["pill-brand", "pill-indigo", "pill-violet", "pill-amber"];

function Node({
  node,
  metrics,
  linkPartners,
}: {
  node: TreeNode;
  metrics: Map<string, NodeMetric>;
  linkPartners: boolean;
}) {
  const [open, setOpen] = useState(node.depth < 2);
  const m = metrics.get(node.partner.id);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className={`org-node ${node.depth === 0 ? "org-node-root" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span className={`pill ${tierTint[Math.min(node.depth, 3)]}`}>L{node.depth}</span>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.25, minWidth: 0, flex: 1 }}>
            {linkPartners ? (
              <Link href={`/partners/${node.partner.slug}`}>{node.partner.name}</Link>
            ) : (
              node.partner.name
            )}
          </div>
          {node.partner.status === "dormant" && <span className="pill pill-amber">休眠</span>}
        </div>
        <div className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>
          <code>{node.partner.referralCode}</code>
          {hasChildren && (
            <span style={{ marginLeft: 8 }}>
              <Users size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> {node.children.length}
            </span>
          )}
        </div>
        {m && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
            <span className="stat-num">{yen(m.totalSales)}</span>
            <span className="h-section" style={{ textTransform: "none", letterSpacing: 0 }}>報酬 {yen(m.confirmed)}</span>
          </div>
        )}
        {hasChildren && (
          <button className="org-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? "折りたたむ" : "展開"}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open ? "閉じる" : `配下 ${node.children.length} を開く`}
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.partner.id} node={c} metrics={metrics} linkPartners={linkPartners} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TreeView({
  roots,
  metrics,
  linkPartners = true,
  rootLabel,
}: {
  roots: TreeNode[];
  metrics: Map<string, NodeMetric>;
  linkPartners?: boolean;
  /** 複数ルートを束ねる仮想ルートのラベル（例: 自社）。単一ルート時は不要 */
  rootLabel?: string;
}) {
  if (roots.length === 0) {
    return <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>表示できるパートナーがいません。</div>;
  }

  const useSynthetic = Boolean(rootLabel) || roots.length > 1;

  return (
    <div className="org-tree scrollbar-thin">
      <div className="org-inner">
        <ul>
          {useSynthetic ? (
            <li>
              <div className="org-node org-node-root" style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{rootLabel ?? "ルート"}</div>
                <div className="h-section" style={{ marginTop: 2 }}>{roots.length} 系列</div>
              </div>
              <ul>
                {roots.map((r) => (
                  <Node key={r.partner.id} node={r} metrics={metrics} linkPartners={linkPartners} />
                ))}
              </ul>
            </li>
          ) : (
            <Node node={roots[0]} metrics={metrics} linkPartners={linkPartners} />
          )}
        </ul>
      </div>
    </div>
  );
}
