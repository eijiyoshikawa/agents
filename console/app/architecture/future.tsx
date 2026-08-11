"use client";

export default function FutureDiagram() {
  return (
    <div className="card p-6 overflow-x-auto">
      <div className="min-w-[920px]">
        <svg viewBox="0 0 900 360" className="w-full h-auto">
          <defs>
            <linearGradient id="lane2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(124,58,237,.08)" />
              <stop offset="100%" stopColor="rgba(236,72,153,.04)" />
            </linearGradient>
            <linearGradient id="edge2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(124,58,237,.6)" />
              <stop offset="100%" stopColor="rgba(236,72,153,.6)" />
            </linearGradient>
            <marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(236,72,153,.7)" />
            </marker>
          </defs>

          {/* Lanes */}
          <rect x="0" y="0" width="220" height="360" rx="12" fill="url(#lane2)" />
          <rect x="240" y="0" width="220" height="360" rx="12" fill="url(#lane2)" />
          <rect x="480" y="0" width="200" height="360" rx="12" fill="url(#lane2)" />
          <rect x="700" y="0" width="200" height="360" rx="12" fill="url(#lane2)" />

          <text x="110" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">DATA SOURCE</text>
          <text x="350" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">AUTO SYNC</text>
          <text x="580" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">VERIFY</text>
          <text x="800" y="28" textAnchor="middle" className="fill-[var(--fg-muted)]" fontSize="11" fontWeight="700" letterSpacing="2">MEMBER</text>

          {/* Sources */}
          <FBox x={20} y={50} title="Google Drive" sub="共有ドライブ全体" color="#7C3AED" />
          <FBox x={20} y={130} title="GitHub Repos × N" sub="他リポも自動巡回" color="#7C3AED" />
          <FBox x={20} y={210} title="agents リポ内" sub="prompt / output / reports" color="#7C3AED" />
          <FBox x={20} y={290} title="Notion / Slack" sub="将来オプション" color="#7C3AED" dashed />

          {/* Sync layer */}
          <FBox x={260} y={70} title="GitHub Actions cron" sub="日次 02:00 JST 実行" color="#EC4899" />
          <FBox x={260} y={150} title="Service Account" sub="Drive metadata 取得" color="#EC4899" />
          <FBox x={260} y={230} title="PAT (cross-repo)" sub="他リポ走査" color="#EC4899" />

          {/* Verify lane (Auth + visibility) */}
          <FBox x={500} y={70} title="Google OAuth" sub="社内ドメイン限定" color="#2A9D8F" />
          <FBox x={500} y={150} title="visibility.json" sub="部署 / 役割で表示制御" color="#2A9D8F" />
          <FBox x={500} y={230} title="監査ログ" sub="誰が何を見たか" color="#2A9D8F" />

          {/* Members */}
          <FBox x={720} y={70} title="経営層" sub="全ページ + コスト" color="#22C58A" />
          <FBox x={720} y={150} title="マネージャー" sub="部門・KPI・ナレッジ" color="#22C58A" />
          <FBox x={720} y={230} title="一般メンバー" sub="プロジェクト・書類" color="#22C58A" />
          <FBox x={720} y={300} title="ゲスト / 社外" sub="限定公開ページのみ" color="#22C58A" dashed />

          {/* Edges Source → Sync */}
          <FEdge x1={195} y1={75} x2={260} y2={95} />
          <FEdge x1={195} y1={155} x2={260} y2={175} />
          <FEdge x1={195} y1={235} x2={260} y2={255} />
          <FEdge x1={195} y1={315} x2={260} y2={175} dashed />

          {/* Sync → Verify (single bus) */}
          <FEdge x1={420} y1={95} x2={500} y2={95} />
          <FEdge x1={420} y1={175} x2={500} y2={175} />
          <FEdge x1={420} y1={255} x2={500} y2={175} />

          {/* Verify → Members fan-out */}
          <FEdge x1={660} y1={95} x2={720} y2={95} />
          <FEdge x1={660} y1={175} x2={720} y2={175} />
          <FEdge x1={660} y1={255} x2={720} y2={255} />
          <FEdge x1={660} y1={175} x2={720} y2={325} dashed />
        </svg>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-xs">
          <Label color="#7C3AED" label="データソース（受動）" />
          <Label color="#EC4899" label="自動同期（cron / API）" />
          <Label color="#2A9D8F" label="認証・公開制御" />
          <Label color="#22C58A" label="メンバー（役割別）" />
        </div>
      </div>
    </div>
  );
}

function FBox({ x, y, title, sub, color, dashed }: { x: number; y: number; title: string; sub: string; color: string; dashed?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={175} height={60} rx={10}
            fill="var(--card)" stroke={color} strokeWidth={1.5}
            strokeOpacity={0.6}
            strokeDasharray={dashed ? "4 4" : undefined} />
      <text x={x + 12} y={y + 22} className="fill-[var(--fg)]" fontSize="12" fontWeight="700">{title}</text>
      <foreignObject x={x + 12} y={y + 28} width={155} height={30}>
        <div className="text-[10px] text-[var(--fg-muted)] leading-tight">{sub}</div>
      </foreignObject>
    </g>
  );
}
function FEdge({ x1, y1, x2, y2, dashed }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  const mid = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  return (
    <path d={path} stroke="url(#edge2)" strokeWidth={1.5} fill="none"
          strokeDasharray={dashed ? "4 4" : undefined}
          markerEnd="url(#arrow2)" />
  );
}
function Label({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--hover)" }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[var(--fg-soft)]">{label}</span>
    </div>
  );
}
