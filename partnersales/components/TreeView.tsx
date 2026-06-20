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
    <li style={{ marginLeft: node.depth === 0 ? 0 : 18, borderLeft: node.depth === 0 ? "none" : "1px solid var(--card-border)", paddingLeft: node.depth === 0 ? 0 : 14 }}>
      <div className="card card-hover" style={{ padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost"
          style={{ padding: 4, borderRadius: 6, visibility: hasChildren ? "visible" : "hidden" }}
          aria-label={open ? "折りたたむ" : "展開"}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className={`pill ${tierTint[Math.min(node.depth, 3)]}`}>L{node.depth}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {linkPartners ? (
              <Link href={`/partners/${node.partner.slug}`}>{node.partner.name}</Link>
            ) : (
              node.partner.name
            )}
            {node.partner.status === "dormant" && <span className="pill pill-amber" style={{ marginLeft: 8 }}>休眠</span>}
          </div>
          <div className="h-section" style={{ marginTop: 2 }}>
            <code>{node.partner.referralCode}</code>
            {hasChildren && (
              <span style={{ marginLeft: 10 }}>
                <Users size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> {node.children.length} 直紹介
              </span>
            )}
          </div>
        </div>
        {m && (
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div className="stat-num" style={{ fontSize: 14 }}>{yen(m.totalSales)}</div>
            <div className="h-section">
              報酬確定 {yen(m.confirmed)}
              {m.pending > 0 && <span style={{ color: "var(--fg-muted)" }}> / 見込 {yen(m.pending)}</span>}
            </div>
          </div>
        )}
      </div>
      {hasChildren && open && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
}: {
  roots: TreeNode[];
  metrics: Map<string, NodeMetric>;
  linkPartners?: boolean;
}) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {roots.map((r) => (
        <Node key={r.partner.id} node={r} metrics={metrics} linkPartners={linkPartners} />
      ))}
    </ul>
  );
}
