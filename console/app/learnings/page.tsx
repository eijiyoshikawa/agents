import { getLearnings } from "@/lib/data";

export default function LearningsIndex() {
  const { instincts, sessions } = getLearnings();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">ナレッジ・継続学習</h1>
        <p className="text-ink-soft mt-1">インスティンクト {instincts.length} 件 / セッション学習 {sessions.length} 件</p>
      </header>
      <section className="card">
        <h2 className="h-section mb-3">インスティンクト</h2>
        {instincts.length === 0 ? <p className="text-sm text-ink-muted">まだありません。</p> : (
          <ul className="space-y-3">
            {instincts.map((i) => (
              <li key={i.id}>
                <div className="text-sm font-semibold">{i.id}</div>
                <div className="text-xs text-ink-muted font-mono">{i.file}</div>
                <pre className="text-xs bg-ink/5 p-2 rounded mt-1 overflow-auto max-h-64">{JSON.stringify(i.data, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card">
        <h2 className="h-section mb-3">セッション学習ログ</h2>
        {sessions.length === 0 ? <p className="text-sm text-ink-muted">セッション学習ログはまだありません。</p> : (
          <ul className="space-y-2">{sessions.map((s) => <li key={s.id} className="text-sm">{s.id}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
