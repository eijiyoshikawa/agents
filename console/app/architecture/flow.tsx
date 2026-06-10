"use client";
import {
  FileCode, FolderOpen, Github, Database, Zap, Globe, User, Users,
  ArrowRight,
} from "lucide-react";

export default function FlowDiagram() {
  return (
    <div className="card p-6 overflow-x-auto">
      <div className="min-w-[920px]">
        <svg viewBox="0 0 900 380" className="w-full h-auto">
          <defs>
            <linearGradient id="lane" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,197,138,.06)" />
              <stop offset="100%" stopColor="rgba(85,102,255,.04)" />
            </linearGradient>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(34,197,138,.6)" />
              <stop offset="100%" stopColor="rgba(85,102,255,.6)" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(85,102,255,.7)" />
            </marker>
          </defs>

          {/* Lane backgrounds */}
          <rect x="0" y="0" width="220" height="380" rx="12" fill="url(#lane)" />
          <rect x="240" y="0" width="220" height="380" rx="12" fill="url(#lane)" />
          <rect x="480" y="0" width="200" height="380" rx="12" fill="url(#lane)" />
          <rect x="700" y="0" width="200" height="380" rx="12" fill="url(#lane)" />

          {/* Lane titles */}
          <text x="110" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">SOURCE</text>
          <text x="350" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">BUILD</text>
          <text x="580" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">DELIVER</text>
          <text x="800" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">CONSUME</text>

          {/* Source boxes */}
          <SourceBox x={20} y={50} title="agents/ リポ内" sub="prompt.md / output.json / daily_reports / learnings / design-md" />
          <SourceBox x={20} y={140} title="Drive マニフェスト" sub="config/drive-manifest.json (10 部門)" />
          <SourceBox x={20} y={230} title="外部 GitHub リポ" sub="他リポ × 10前後（PAT 経由）" />
          <SourceBox x={20} y={320} title="今後: Drive API" sub="Service Account メタ自動取得" dashed />

          {/* Build boxes */}
          <BuildBox x={260} y={70} title="scan-repo.mjs" sub="リポ内ファイル走査" badge="JS" />
          <BuildBox x={260} y={160} title="scan-github.mjs" sub="GitHub REST API" badge="JS" />
          <BuildBox x={260} y={250} title="data/*.json" sub="agents / projects / drive / repos / search-index" badge="JSON" />

          {/* Deliver boxes */}
          <DeliverBox x={500} y={100} title="Next.js build" sub="output: export → out/" />
          <DeliverBox x={500} y={200} title="gh-pages / Vercel" sub="静的 CDN 配信" />

          {/* Consumer boxes */}
          <ConsumerBox x={720} y={90} title="ブラウザ" sub="HTML + JS + JSON" />
          <ConsumerBox x={720} y={200} title="社員 / 関係者" sub="50名規模 想定" />

          {/* Edges */}
          <Edge x1={195} y1={75} x2={260} y2={95} />
          <Edge x1={195} y1={165} x2={260} y2={185} />
          <Edge x1={195} y1={255} x2={260} y2={185} />
          <Edge x1={195} y1={345} x2={260} y2={185} dashed />

          <Edge x1={420} y1={95} x2={500} y2={125} />
          <Edge x1={420} y1={185} x2={500} y2={125} />
          <Edge x1={420} y1={275} x2={500} y2={125} />

          <Edge x1={650} y1={125} x2={650} y2={200} dy />
          <Edge x1={680} y1={225} x2={720} y2={225} />
          <Edge x1={815} y1={130} x2={815} y2={200} dy thin />
        </svg>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-xs">
          <Legend icon={Database} label="データソース" color="brand-glow" />
          <Legend icon={Zap} label="ビルドステップ" color="accent-indigo" />
          <Legend icon={Globe} label="配信" color="accent-amber" />
          <Legend icon={Users} label="メンバー" color="accent-violet" />
        </div>
      </div>
    </div>
  );
}

function SourceBox({ x, y, title, sub, dashed }: { x: number; y: number; title: string; sub: string; dashed?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={175} height={70} rx={10}
            fill="var(--card)" stroke="rgba(34,197,138,.6)" strokeWidth={1.5}
            strokeDasharray={dashed ? "4 4" : undefined} />
      <text x={x + 12} y={y + 22} className="fill-[var(--fg)]" fontSize="12" fontWeight="700">{title}</text>
      <foreignObject x={x + 12} y={y + 30} width={155} height={35}>
        <div className="text-[10px] text-[var(--fg-muted)] leading-tight">{sub}</div>
      </foreignObject>
    </g>
  );
}
function BuildBox({ x, y, title, sub, badge }: { x: number; y: number; title: string; sub: string; badge?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={160} height={70} rx={10}
            fill="var(--card)" stroke="rgba(85,102,255,.6)" strokeWidth={1.5} />
      <text x={x + 12} y={y + 22} className="fill-[var(--fg)]" fontSize="12" fontWeight="700">{title}</text>
      <foreignObject x={x + 12} y={y + 30} width={140} height={35}>
        <div className="text-[10px] text-[var(--fg-muted)] leading-tight">{sub}</div>
      </foreignObject>
      {badge ? (
        <g>
          <rect x={x + 125} y={y + 8} width={28} height={14} rx={4} fill="rgba(85,102,255,.18)" />
          <text x={x + 139} y={y + 18} textAnchor="middle" className="fill-[#5566FF]" fontSize="9" fontWeight="700">{badge}</text>
        </g>
      ) : null}
    </g>
  );
}
function DeliverBox({ x, y, title, sub }: { x: number; y: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={160} height={60} rx={10}
            fill="var(--card)" stroke="rgba(232,169,61,.6)" strokeWidth={1.5} />
      <text x={x + 12} y={y + 22} className="fill-[var(--fg)]" fontSize="12" fontWeight="700">{title}</text>
      <foreignObject x={x + 12} y={y + 28} width={140} height={28}>
        <div className="text-[10px] text-[var(--fg-muted)] leading-tight">{sub}</div>
      </foreignObject>
    </g>
  );
}
function ConsumerBox({ x, y, title, sub }: { x: number; y: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={160} height={65} rx={10}
            fill="var(--card)" stroke="rgba(124,58,237,.6)" strokeWidth={1.5} />
      <text x={x + 12} y={y + 22} className="fill-[var(--fg)]" fontSize="12" fontWeight="700">{title}</text>
      <foreignObject x={x + 12} y={y + 28} width={140} height={32}>
        <div className="text-[10px] text-[var(--fg-muted)] leading-tight">{sub}</div>
      </foreignObject>
    </g>
  );
}
function Edge({ x1, y1, x2, y2, dashed, dy, thin }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean; dy?: boolean; thin?: boolean }) {
  // Curved edge using cubic bezier
  const mid = (x1 + x2) / 2;
  const path = dy
    ? `M ${x1} ${y1} L ${x2} ${y2}`
    : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  return (
    <path d={path}
          stroke="url(#edge)"
          strokeWidth={thin ? 1 : 1.5}
          fill="none"
          strokeDasharray={dashed ? "4 4" : undefined}
          markerEnd="url(#arrow)" />
  );
}
function Legend({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--hover)" }}>
      <Icon className={`w-3.5 h-3.5 text-${color}`} />
      <span className="text-[var(--fg-soft)]">{label}</span>
    </div>
  );
}
