"use client";
import { useState } from "react";
import { Shield, LogOut, Eye, EyeOff, RotateCcw, Download, Key } from "lucide-react";
import { useConsole } from "@/components/ConsoleProviders";

type Config = any;

export default function AdminClient({ initialConfig }: { initialConfig: Config }) {
  const { isAdmin, enterAdmin, exitAdmin, overrides, setOverride, resetOverrides, isVisible } = useConsole();
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="card relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-brand-glow to-accent-indigo opacity-15" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-glow to-accent-indigo flex items-center justify-center shadow-glow-brand">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold mt-4">管理者ログイン</h1>
            <p className="text-sm text-[var(--fg-muted)] mt-1">{initialConfig.passphraseHint}</p>
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const ok = enterAdmin(pass);
                setError(!ok);
              }}
            >
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => { setPass(e.target.value); setError(false); }}
                  placeholder="パスフレーズ"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-glow/30 ${error ? "border-accent-red" : ""}`}
                  style={{ borderColor: error ? "#E03E3E" : "var(--card-border)" }}
                  autoFocus
                />
              </div>
              {error && <div className="text-xs text-accent-red">パスフレーズが違います</div>}
              <button type="submit" className="btn btn-primary w-full justify-center">ログイン</button>
            </form>
            <p className="text-[10px] text-[var(--fg-muted)] mt-4 leading-relaxed">
              ※ MVP のためパスフレーズはクライアント側で照合しています。本番運用時は Google OAuth 等への移行を推奨します。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pages = initialConfig.pages as Record<string, { label?: string; visible: boolean; adminOnly?: boolean }>;
  const sections = initialConfig.sections as Record<string, { label?: string; visible: boolean; adminOnly?: boolean }>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="h-section">管理者モード</span>
          </div>
          <h1 className="text-3xl font-bold mt-1">公開設定</h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">ページ・セクションごとに、閲覧者に見せるかどうかを切り替えできます。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetOverrides} className="btn btn-ghost"><RotateCcw className="w-3.5 h-3.5" />初期化</button>
          <button onClick={exitAdmin} className="btn btn-ghost"><LogOut className="w-3.5 h-3.5" />ログアウト</button>
        </div>
      </header>

      <section className="card">
        <h2 className="font-semibold mb-1">ページ</h2>
        <p className="text-xs text-[var(--fg-muted)] mb-4">サイドバーに表示する/しないを制御します。</p>
        <ul className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {Object.entries(pages).map(([key, p]) => {
            const visible = isVisible(key, { adminContext: true });
            return (
              <li key={key} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.label ?? key}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] font-mono">{key}{p.adminOnly ? " · 管理者専用" : ""}</div>
                </div>
                <ToggleBtn visible={visible} onChange={(v) => setOverride(key, v)} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">セクション</h2>
        <p className="text-xs text-[var(--fg-muted)] mb-4">各ページ内のブロック単位で公開を制御します。</p>
        <ul className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {Object.entries(sections).map(([key, p]) => {
            const visible = isVisible(key, { adminContext: true });
            return (
              <li key={key} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.label ?? key}</div>
                  <div className="text-[11px] text-[var(--fg-muted)] font-mono">{key}{p.adminOnly ? " · 管理者専用" : ""}</div>
                </div>
                <ToggleBtn visible={visible} onChange={(v) => setOverride(key, v)} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">現在の上書き設定</h2>
        <p className="text-xs text-[var(--fg-muted)] mb-3">
          ブラウザ（localStorage）に保存されます。チーム全体へ反映するには下記 JSON を <code className="font-mono">config/visibility.json</code> に反映してビルドし直してください。
        </p>
        <div className="flex gap-2 mb-3">
          <button
            className="btn btn-ghost"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ ...initialConfig, overrides }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "visibility.json"; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            visibility.json を書き出し
          </button>
        </div>
        <pre className="text-xs bg-[var(--hover)] p-3 rounded overflow-auto max-h-72">{JSON.stringify(overrides, null, 2)}</pre>
      </section>
    </div>
  );
}

function ToggleBtn({ visible, onChange }: { visible: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!visible)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
        visible
          ? "bg-brand-glow/15 text-brand-glow hover:bg-brand-glow/25"
          : "bg-[var(--hover)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
      }`}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {visible ? "公開" : "非公開"}
    </button>
  );
}
