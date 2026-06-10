import Link from "next/link";
import { getTemplates } from "@/lib/data";

export default function DocumentsIndex() {
  const templates = getTemplates();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">書類作成</h1>
        <p className="text-ink-soft mt-1">テンプレートを選んで、対応エージェントに生成タスクを発注します（MVP: 入力フォーム → ブリーフ生成）</p>
      </header>
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Link key={t.id} href={`/documents/new/${t.id}`} className="card hover:shadow-md transition">
            <div className="h-section">{t.output}</div>
            <h2 className="text-lg font-semibold mt-1">{t.title}</h2>
            <p className="text-sm text-ink-soft mt-2">{t.description}</p>
            <div className="text-xs text-ink-muted mt-3">担当: <span className="font-mono">{t.agent}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
