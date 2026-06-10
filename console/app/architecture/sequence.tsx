"use client";
import { User, Cloud, Globe, Sparkles, ShieldCheck } from "lucide-react";

const STEPS = [
  { actor: "メンバー", icon: User, color: "accent-violet", action: "ブラウザで URL を開く", detail: "https://agents.example.com/", target: "CDN" },
  { actor: "CDN (Vercel/gh-pages)", icon: Cloud, color: "accent-amber", action: "HTML + JS + data/*.json を返す", detail: "静的ファイル · TTFB < 50ms", target: "ブラウザ" },
  { actor: "ブラウザ", icon: Globe, color: "accent-indigo", action: "テーマ判定 + サイドバー描画", detail: "localStorage から theme / admin 読込", target: "メンバー" },
  { actor: "メンバー", icon: User, color: "accent-violet", action: "⌘K で横断検索", detail: "search-index.json をクライアント検索", target: "ブラウザ" },
  { actor: "（任意）管理者", icon: ShieldCheck, color: "brand-glow", action: "/admin でパスフレーズ → 非公開セクション解禁", detail: "クライアント側で照合", target: "—" },
];

export default function SequenceDiagram() {
  return (
    <div className="card p-6">
      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-glow to-accent-indigo text-white flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                {i < STEPS.length - 1 ? <div className="w-0.5 flex-1 mt-1" style={{ background: "var(--card-border)", minHeight: 32 }} /> : null}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon className={`w-3.5 h-3.5 text-${s.color}`} />
                  <span className="text-xs font-semibold">{s.actor}</span>
                  <span className="text-xs text-[var(--fg-muted)]">→</span>
                  <span className="text-xs text-[var(--fg-muted)]">{s.target}</span>
                </div>
                <div className="text-sm font-medium mt-1">{s.action}</div>
                <div className="text-xs text-[var(--fg-muted)] mt-0.5">{s.detail}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
        <div className="h-section mb-2">特徴</div>
        <ul className="text-xs text-[var(--fg-soft)] space-y-1.5">
          <li className="flex items-start gap-2"><Sparkles className="w-3 h-3 mt-0.5 text-brand-glow shrink-0" /> サーバ側の処理は一切なし。全て CDN + ブラウザで完結</li>
          <li className="flex items-start gap-2"><Sparkles className="w-3 h-3 mt-0.5 text-brand-glow shrink-0" /> メンバーが何人増えても追加コスト 0 円（CDN 帯域のみ）</li>
          <li className="flex items-start gap-2"><Sparkles className="w-3 h-3 mt-0.5 text-brand-glow shrink-0" /> 検索インデックスは事前生成なので、検索結果は即座（10ms 未満）</li>
          <li className="flex items-start gap-2"><Sparkles className="w-3 h-3 mt-0.5 text-brand-glow shrink-0" /> オフラインでもキャッシュからほぼ全機能が動く</li>
        </ul>
      </div>
    </div>
  );
}
