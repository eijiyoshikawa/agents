import { Network, Users, GitBranch, Cloud, Database, FolderOpen, Github, Sparkles, ShieldCheck, Zap } from "lucide-react";
import FlowDiagram from "./flow";
import SequenceDiagram from "./sequence";
import FutureDiagram from "./future";

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">アーキテクチャ</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">データの流れとメンバー導線</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          コンソールに「データがどう集まるか」と「メンバーがどう見るか」を可視化
        </p>
      </header>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-glow to-accent-indigo flex items-center justify-center text-xs font-bold text-white">1</div>
          <h2 className="text-lg font-semibold">全体フロー</h2>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          データソース → ビルド時に集約 → 静的サイト配信 → メンバーがブラウザでアクセス、という単方向の流れ。
          ランタイムでサーバを動かさないため、メンバー数が増えても追加費用は発生しません。
        </p>
        <FlowDiagram />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-xs font-bold text-white">2</div>
          <h2 className="text-lg font-semibold">メンバーアクセス時系列</h2>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          ページを開いてから ⌘K で検索・管理者モード切替までの 5 ステップ。
        </p>
        <SequenceDiagram />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-amber to-accent-pink flex items-center justify-center text-xs font-bold text-white">3</div>
          <h2 className="text-lg font-semibold">将来形（OAuth + 自動 Drive 同期）</h2>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          現在はマニフェスト方式 + パスフレーズ。OAuth と Service Account 自動同期に切り替えると、
          メンバー追加とデータ更新が完全自動化されます。
        </p>
        <FutureDiagram />
      </section>

      <section className="grid md:grid-cols-3 gap-3">
        <Step n={1} icon={Database} title="データソース" body="agents/ プロンプト・output.json、daily_reports/、learnings/、design-md/、drive-manifest.json、外部 GitHub リポ" color="from-brand-glow to-accent-teal" />
        <Step n={2} icon={Zap} title="ビルド時集約" body="GitHub Actions / Vercel が scan-repo + scan-github を実行。data/*.json を生成し Next.js が静的サイトをエクスポート" color="from-accent-indigo to-accent-violet" />
        <Step n={3} icon={Cloud} title="配信" body="gh-pages または Vercel CDN。サーバ無し、世界中のエッジから秒で配信" color="from-accent-amber to-accent-pink" />
        <Step n={4} icon={Users} title="メンバー" body="ブラウザで URL を開くだけ。検索・テーマ切替・管理者モードは全て localStorage" color="from-accent-violet to-brand-glow" />
        <Step n={5} icon={ShieldCheck} title="管理者" body="パスフレーズ（or OAuth 移行後はドメイン認証）で公開設定を編集" color="from-accent-teal to-accent-indigo" />
        <Step n={6} icon={Sparkles} title="自動更新" body="main への push、または cron で再ビルド。最新データが数分で反映される" color="from-accent-pink to-accent-amber" />
      </section>
    </div>
  );
}

function Step({ n, icon: Icon, title, body, color }: { n: number; icon: any; title: string; body: string; color: string }) {
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-15`} />
      <div className="flex items-center gap-2 relative">
        <span className="w-6 h-6 rounded-full bg-[var(--hover)] flex items-center justify-center text-[10px] font-bold">{n}</span>
        <Icon className="w-4 h-4 text-[var(--fg-muted)]" />
      </div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-xs text-[var(--fg-soft)] mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}
