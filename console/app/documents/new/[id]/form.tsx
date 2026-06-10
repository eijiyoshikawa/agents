"use client";
import { useState } from "react";
import type { Template } from "@/lib/data";

export default function DocumentForm({ template }: { template: Template }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);

  const update = (id: string, v: string) => setValues((s) => ({ ...s, [id]: v }));

  const generateBrief = () => {
    const lines = [
      `# ${template.title} — ドラフトブリーフ`,
      ``,
      `**担当エージェント:** ${template.agent}`,
      `**出力形式:** ${template.output}`,
      `**生成元:** ${template.sourcePath}`,
      ``,
      `## 入力内容`,
      ...template.fields.map((f) => `- **${f.label}:** ${values[f.id] || "（未入力）"}`),
      ``,
      `## 次のアクション`,
      `1. Claude Code でこのブリーフを ${template.agent} に渡して実出力を生成`,
      `2. QA Reviewer がスキーマ・整合性・コンテンツ妥当性をチェック`,
      `3. 必要に応じて Devil's Advocate / Legal / Finance の二次レビュー`,
    ];
    setSubmitted(lines.join("\n"));
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form className="card space-y-4" onSubmit={(e) => { e.preventDefault(); generateBrief(); }}>
        <h2 className="h-section">入力フォーム</h2>
        {template.fields.map((f) => (
          <div key={f.id}>
            <label className="block text-sm font-medium mb-1">
              {f.label} {f.required ? <span className="text-accent-red">*</span> : null}
            </label>
            {f.type === "textarea" ? (
              <textarea
                required={f.required}
                value={values[f.id] || ""}
                onChange={(e) => update(f.id, e.target.value)}
                rows={4}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            ) : f.type === "select" ? (
              <select
                required={f.required}
                value={values[f.id] || ""}
                onChange={(e) => update(f.id, e.target.value)}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">選択してください</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type}
                required={f.required}
                value={values[f.id] || ""}
                onChange={(e) => update(f.id, e.target.value)}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            )}
          </div>
        ))}
        <button type="submit" className="w-full bg-brand text-white rounded px-4 py-2 text-sm font-medium hover:bg-brand-soft transition">
          ブリーフを生成
        </button>
      </form>
      <div className="card">
        <h2 className="h-section mb-3">生成ブリーフ</h2>
        {submitted ? (
          <>
            <pre className="text-xs bg-ink/5 p-3 rounded overflow-auto max-h-[600px] whitespace-pre-wrap font-mono">{submitted}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(submitted)}
              className="mt-3 text-xs px-3 py-1.5 rounded border border-ink/15 hover:bg-ink/5"
            >コピー</button>
          </>
        ) : (
          <p className="text-sm text-ink-muted">左のフォームから入力後、生成ボタンを押してください。生成ブリーフは Claude Code に貼り付けて担当エージェントに実出力を依頼できます。</p>
        )}
      </div>
    </div>
  );
}
