import { BookOpen, Sparkles, Clock } from "lucide-react";
import { getLearnings } from "@/lib/data";

export default function LearningsIndex() {
  const { instincts, sessions } = getLearnings();
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">ナレッジ・継続学習</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">インスティンクト & セッション学習</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{instincts.length} インスティンクト / {sessions.length} セッション</p>
      </header>

      <section className="card animate-growFromBottom">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> インスティンクト</h2>
        {instincts.length === 0 ? (
          <div className="text-sm text-[var(--fg-muted)] py-6 text-center">
            <p>まだ蓄積されていません。</p>
            <p className="text-xs opacity-75 mt-2">パターンが繰り返し確認されると、ここに自動で蓄積されます。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {instincts.map((i) => (
              <li key={i.id} className="border rounded-lg p-3" style={{ borderColor: "var(--card-border)" }}>
                <div className="text-sm font-semibold">{i.id}</div>
                <div className="text-xs text-[var(--fg-muted)] font-mono mt-0.5">{i.file}</div>
                <pre className="text-xs p-2 rounded mt-2 overflow-auto max-h-64 scrollbar-thin" style={{ background: "var(--hover)" }}>{JSON.stringify(i.data, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card animate-growFromBottom" style={{ animationDelay: "100ms" }}>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> セッション学習ログ</h2>
        {sessions.length === 0 ? (
          <div className="text-sm text-[var(--fg-muted)] py-6 text-center">セッション学習ログはまだありません。</div>
        ) : (
          <ul className="space-y-2 text-sm">{sessions.map((s) => <li key={s.id}>{s.id}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
