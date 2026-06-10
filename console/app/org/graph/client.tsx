"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background, Controls, MiniMap, MarkerType, Position, type Node, type Edge, type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import { ArrowLeft, GitBranch, Eye, Layers } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  department: string;
  color: string;
  interferences?: string[];
};

const DEPT_COLOR: Record<string, string> = {
  統括: "#5566FF",
  コンサル: "#E8A93D",
  営業: "#E03E3E",
  管理: "#2A9D8F",
  開発: "#22C58A",
  横断: "#7C3AED",
  プロジェクト: "#EC4899",
  サブ: "#71717A",
  廃止: "#A1A1AA",
  未分類: "#A1A1AA",
};

const COL_ORDER = ["統括", "コンサル", "営業", "管理", "開発", "横断", "プロジェクト", "サブ"];

export default function GraphClient({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [focus, setFocus] = useState<string | null>(null);
  const [hideOrphans, setHideOrphans] = useState(false);

  const { nodes, edges, focusedNode } = useMemo(() => {
    const byDept: Record<string, Agent[]> = {};
    agents.forEach((a) => { if (a.department !== "廃止") (byDept[a.department] ??= []).push(a); });

    const columnX: Record<string, number> = {};
    COL_ORDER.forEach((d, i) => { columnX[d] = i * 260; });

    // Build set of valid agent ids
    const allIds = new Set(agents.map((a) => a.id));

    // Pre-compute edges
    const edgeList: Edge[] = [];
    for (const a of agents) {
      for (const target of a.interferences ?? []) {
        // Try to match: target might be a token like "ceo" or "sales_agent"
        const normalizedTarget = target.replace(/_agent$/, "");
        if (a.id === target) continue;
        if (allIds.has(target)) {
          edgeList.push({
            id: `${a.id}->${target}`,
            source: a.id,
            target,
            type: "default",
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "rgba(34,197,138,.4)" },
            style: { stroke: "rgba(34,197,138,.25)", strokeWidth: 1 },
          });
        } else if (allIds.has(normalizedTarget)) {
          edgeList.push({
            id: `${a.id}->${normalizedTarget}`,
            source: a.id,
            target: normalizedTarget,
            type: "default",
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "rgba(34,197,138,.4)" },
            style: { stroke: "rgba(34,197,138,.25)", strokeWidth: 1 },
          });
        }
      }
    }

    // Connected node ids
    const connected = new Set<string>();
    edgeList.forEach((e) => { connected.add(e.source); connected.add(e.target); });

    // Filter for orphans
    const visibleAgents = hideOrphans ? agents.filter((a) => connected.has(a.id)) : agents.filter((a) => a.department !== "廃止");

    // Re-group by department after filtering
    const byDeptVisible: Record<string, Agent[]> = {};
    visibleAgents.forEach((a) => { (byDeptVisible[a.department] ??= []).push(a); });

    const nodeList: Node[] = [];
    for (const dept of Object.keys(byDeptVisible)) {
      const x = columnX[dept] ?? (Object.keys(columnX).length * 260);
      byDeptVisible[dept].forEach((a, i) => {
        const isFocus = a.id === focus;
        const inFocus = !focus || a.id === focus ||
          edgeList.some((e) => (e.source === focus && e.target === a.id) || (e.target === focus && e.source === a.id));
        nodeList.push({
          id: a.id,
          position: { x, y: i * 70 },
          data: { label: a.name, dept },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            background: isFocus ? DEPT_COLOR[dept] ?? "#71717A" : "transparent",
            color: isFocus ? "white" : "var(--fg)",
            border: `1.5px solid ${DEPT_COLOR[dept] ?? "#71717A"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            opacity: inFocus ? 1 : 0.18,
            minWidth: 140,
            textAlign: "center" as const,
            boxShadow: isFocus ? `0 0 0 4px ${DEPT_COLOR[dept]}40` : "none",
            transition: "opacity .2s",
          },
        });
      });
    }

    const visibleNodeIds = new Set(nodeList.map((n) => n.id));
    const filteredEdges = edgeList
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => {
        const inFocus = !focus || e.source === focus || e.target === focus;
        return {
          ...e,
          style: {
            ...e.style,
            opacity: inFocus ? 0.6 : 0.05,
            strokeWidth: inFocus ? 1.5 : 1,
          },
          animated: focus ? (e.source === focus || e.target === focus) : false,
        };
      });

    const focusedNode = focus ? agents.find((a) => a.id === focus) : null;
    return { nodes: nodeList, edges: filteredEdges, focusedNode };
  }, [agents, focus, hideOrphans]);

  const onNodeClick: NodeMouseHandler = (_e, n) => setFocus(n.id);

  const focusedConnections = focus
    ? edges.filter((e) => e.source === focus || e.target === focus).length
    : 0;

  return (
    <div className="space-y-4">
      <Link href="/org" className="inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="w-3.5 h-3.5" /> 組織マップ
      </Link>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-[var(--fg-muted)]" />
            <span className="h-section">相互干渉ネットワーク</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">グラフビュー</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">ノードをクリックすると、関係するエージェントだけが浮かび上がります。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideOrphans((v) => !v)}
            className={`btn ${hideOrphans ? "btn-primary" : "btn-ghost"}`}
          >
            <Layers className="w-3.5 h-3.5" />
            {hideOrphans ? "孤立ノード非表示中" : "孤立ノードを隠す"}
          </button>
          {focus ? (
            <button onClick={() => setFocus(null)} className="btn btn-ghost">
              <Eye className="w-3.5 h-3.5" />
              フォーカス解除
            </button>
          ) : null}
        </div>
      </header>

      <div className="card p-0 overflow-hidden" style={{ height: 620 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="rgba(125,125,135,.2)" />
          <Controls position="bottom-right" />
          <MiniMap
            position="bottom-left"
            nodeColor={(n) => DEPT_COLOR[(n.data as any).dept] ?? "#71717A"}
            nodeStrokeWidth={2}
            maskColor="rgba(0,0,0,.05)"
            style={{ background: "var(--card)" }}
          />
        </ReactFlow>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card">
          <div className="h-section">ノード</div>
          <div className="stat-num text-2xl mt-1">{nodes.length}</div>
        </div>
        <div className="card">
          <div className="h-section">エッジ（関係）</div>
          <div className="stat-num text-2xl mt-1">{edges.length}</div>
        </div>
        <div className="card">
          <div className="h-section">フォーカス中</div>
          <div className="text-base font-semibold mt-1">{focusedNode?.name ?? "—"}</div>
          {focusedNode ? <div className="text-xs text-[var(--fg-muted)] mt-0.5">{focusedConnections} 件の関係</div> : null}
        </div>
      </div>

      <div className="card">
        <h2 className="h-section mb-3">凡例（部門カラー）</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(DEPT_COLOR).filter(([d]) => d !== "廃止" && d !== "未分類").map(([d, c]) => (
            <span key={d} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border" style={{ borderColor: c, color: c }}>
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
