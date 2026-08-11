import {
  Wallet, Server, Cloud, GitBranch, Zap, ShieldCheck, Users,
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Info,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthlyJPY: number;
  oneTimeJPY?: number;
  highlight?: boolean;
  items: { label: string; value: string; note?: string }[];
};

const PLANS: Plan[] = [
  {
    id: "mvp",
    name: "MVP（現状）",
    tagline: "静的サイト・認証なし・手動 Drive 同期",
    monthlyJPY: 0,
    items: [
      { label: "ホスティング", value: "¥0", note: "gh-pages または Vercel Hobby 無料枠" },
      { label: "CI/CD", value: "¥0", note: "GitHub Actions 月 2,000 分無料（Public リポジトリは無制限）" },
      { label: "Drive 連携", value: "¥0", note: "マニュアル更新（drive-manifest.json 手編集）" },
      { label: "認証", value: "¥0", note: "なし · パスフレーズによる管理者モードのみ" },
      { label: "管理工数", value: "月 2-3h", note: "週次でマニフェスト更新 / 月次で改善" },
    ],
  },
  {
    id: "auto-drive",
    name: "自動 Drive 同期",
    tagline: "Service Account による無人同期",
    monthlyJPY: 0,
    oneTimeJPY: 0,
    highlight: true,
    items: [
      { label: "ホスティング", value: "¥0", note: "Vercel Hobby または Cloudflare Pages（無料）" },
      { label: "GitHub Actions", value: "¥0 - ¥500", note: "Private repo の場合 ¥500/月程度（深夜同期 × 30回）" },
      { label: "Google Drive API", value: "¥0", note: "Workspace 契約内、追加課金なし（メタデータ取得のみ）" },
      { label: "Service Account", value: "¥0", note: "Google Cloud 上で無料" },
      { label: "管理工数", value: "月 30min", note: "自動同期失敗時の対応のみ" },
    ],
  },
  {
    id: "dynamic",
    name: "動的サイト + 認証",
    tagline: "Google OAuth · 書類保存 · 編集機能",
    monthlyJPY: 2500,
    items: [
      { label: "Vercel Pro", value: "¥3,000/月", note: "¥3,000 × USD レート換算（チーム単位、複数プロジェクト共有可）" },
      { label: "Supabase Pro", value: "¥3,800/月", note: "DB + Auth + Storage、書類保存・編集を実装する場合" },
      { label: "Google OAuth", value: "¥0", note: "Workspace 内ドメイン認証" },
      { label: "GitHub Actions", value: "¥500/月", note: "Private repo の Action 分課金" },
      { label: "管理工数", value: "月 1-2h", note: "" },
      { label: "※2,500円は最小構成", value: "Vercel/Supabase 無料枠で済む場合あり", note: "アクセス数や DB サイズ次第。50名以下なら無料枠で運用可能" },
    ],
  },
  {
    id: "enterprise",
    name: "本格運用",
    tagline: "監査ログ・SLO・ステージング含む",
    monthlyJPY: 12000,
    items: [
      { label: "Vercel Pro × 2 環境", value: "¥6,000/月", note: "本番 + ステージング" },
      { label: "Supabase Pro", value: "¥3,800/月", note: "" },
      { label: "監査ログ保管", value: "¥1,000/月", note: "Cloudflare R2 / S3" },
      { label: "監視 (UptimeRobot 等)", value: "¥1,000/月", note: "" },
      { label: "管理工数", value: "月 4-6h", note: "障害対応・改修含む" },
    ],
  },
];

const RISK = [
  { type: "saving", label: "節約ポイント", icon: TrendingDown, items: [
    "Workspace 契約済みなら Drive 連携は追加コスト 0 円",
    "Public リポジトリなら GitHub Actions 無制限",
    "Cloudflare Pages を使えば帯域も実質無制限",
    "Supabase 無料枠（500MB DB、5GB ストレージ）で 50名規模は十分",
  ]},
  { type: "watch", label: "注意ポイント", icon: AlertCircle, items: [
    "Vercel の帯域: 月 100GB 超過時に従量課金（社内利用ならほぼ起きない）",
    "Drive API の Quota: 10,000 req/day（同期間隔を 1 日 1 回にすれば余裕）",
    "個人情報を扱う場合は Supabase の保管リージョン（東京）と暗号化を確認",
    "管理者パスフレーズは漏れたら全員に再共有が必要 → OAuth 移行推奨",
  ]},
];

const COMPARE = [
  { label: "Notion + Drive で同等の運用", monthly: 4400, note: "Notion ビジネス @1,650 × 4名 + Drive（既存）" },
  { label: "Confluence + Jira", monthly: 11000, note: "10ユーザー前提" },
  { label: "SaaS BI ダッシュボード", monthly: 30000, note: "Looker Studio Pro / Tableau" },
  { label: "内製コンソール（本案 自動 Drive 同期プラン）", monthly: 500, note: "ホスティング + CI のみ" },
];

export default function CostsPage() {
  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">コスト試算</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">社内運用コスト</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">前提：50名規模 · 平日アクセス · Google Workspace 契約済 · 基幹データは Drive 上</p>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLANS.map((p, i) => (
          <div
            key={p.id}
            className={`card relative overflow-hidden animate-growFromBottom ${p.highlight ? "ring-2 ring-brand-glow shadow-glow-brand" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {p.highlight ? (
              <div className="absolute top-0 right-0 px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-white"
                   style={{ background: "var(--accent)" }}>推奨</div>
            ) : null}
            <div className="h-section">{p.tagline}</div>
            <h2 className="text-lg font-bold mt-1">{p.name}</h2>
            <div className="mt-3">
              <span className="text-3xl font-bold tracking-tight">¥{p.monthlyJPY.toLocaleString()}</span>
              <span className="text-xs text-[var(--fg-muted)] ml-1">/ 月</span>
            </div>
            {p.oneTimeJPY ? (
              <div className="text-xs text-[var(--fg-muted)] mt-1">+ 初期 ¥{p.oneTimeJPY.toLocaleString()}</div>
            ) : null}
            <ul className="mt-4 space-y-2 text-xs">
              {p.items.map((it) => (
                <li key={it.label} className="border-b pb-2 last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--fg-soft)]">{it.label}</span>
                    <span className="font-medium tabular-nums">{it.value}</span>
                  </div>
                  {it.note ? <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{it.note}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        {RISK.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="card animate-growFromBottom" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <h2 className="font-semibold flex items-center gap-2">
                <Icon className={`w-4 h-4 ${r.type === "saving" ? "text-brand-glow" : "text-accent-amber"}`} />
                {r.label}
              </h2>
              <ul className="mt-3 space-y-2">
                {r.items.map((it) => (
                  <li key={it} className="text-sm text-[var(--fg-soft)] flex gap-2">
                    {r.type === "saving" ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-glow mt-0.5 shrink-0" /> : <Info className="w-3.5 h-3.5 text-accent-amber mt-0.5 shrink-0" />}
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 他案との比較</h2>
        <p className="text-sm text-[var(--fg-muted)] mb-4">50名規模で同等の社内可視化・ナレッジ管理を実現する場合の概算（月額）</p>
        <ul className="space-y-2">
          {[...COMPARE].sort((a, b) => b.monthly - a.monthly).map((c) => {
            const isOurs = c.label.includes("内製");
            return (
              <li key={c.label} className={`flex items-center gap-3 p-3 rounded-lg border ${isOurs ? "ring-1 ring-brand-glow" : ""}`}
                  style={{ borderColor: "var(--card-border)" }}>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isOurs ? "text-brand-glow" : ""}`}>{c.label}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">{c.note}</div>
                </div>
                <div className="text-right">
                  <div className="stat-num text-lg">¥{c.monthly.toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">/ 月</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card relative overflow-hidden bg-mesh">
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight">推奨ロードマップ</h2>
          <ol className="mt-4 space-y-3">
            <Step n={1} title="MVP 配信（今）" sub="gh-pages で社内公開、Drive はマニフェスト方式" cost="¥0/月" />
            <Step n={2} title="Drive 自動同期" sub="Service Account を発行、scan-drive.mjs を実装" cost="¥0-500/月" />
            <Step n={3} title="OAuth 認証" sub="Workspace ドメイン限定、管理者パスフレーズを廃止" cost="¥0/月" />
            <Step n={4} title="動的化（必要に応じて）" sub="書類保存・編集・コメント等を Supabase で実装" cost="¥2,500/月" />
          </ol>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, sub, cost }: { n: number; title: string; sub: string; cost: string }) {
  return (
    <li className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-glow to-accent-indigo text-white flex items-center justify-center text-sm font-bold shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-[var(--fg-muted)] mt-0.5">{sub}</div>
      </div>
      <div className="pill pill-brand self-start">{cost}</div>
    </li>
  );
}
