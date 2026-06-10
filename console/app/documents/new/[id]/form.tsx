"use client";
import { useState } from "react";
import { Copy, Check, Wand2, Eraser } from "lucide-react";
import type { Template } from "@/lib/data";

export default function DocumentForm({ template }: { template: Template }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copy = () => {
    if (!submitted) return;
    navigator.clipboard.writeText(submitted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form className="card" onSubmit={(e) => { e.preventDefault(); generateBrief(); }}>
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Wand2 className="w-4 h-4" /> 入力フォーム</h2>
        <div className="space-y-4">
          {template.fields.map((f) => (
            <div key={f.id}>
              <label className="block text-xs font-medium mb-1.5 text-[var(--fg-soft)]">
                {f.label} {f.required ? <span className="text-accent-red">*</span> : null}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  value={values[f.id] || ""}
                  onChange={(e) => update(f.id, e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-glow/30"
                  style={{ borderColor: "var(--card-border)" }}
                />
              ) : f.type === "select" ? (
                <select
                  required={f.required}
                  value={values[f.id] || ""}
                  onChange={(e) => update(f.id, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-glow/30"
                  style={{ borderColor: "var(--card-border)" }}
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
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-glow/30"
                  style={{ borderColor: "var(--card-border)" }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button type="submit" className="btn btn-primary flex-1 justify-center">
            <Wand2 className="w-3.5 h-3.5" /> ブリーフを生成
          </button>
          <button type="button" onClick={() => { setValues({}); setSubmitted(null); }} className="btn btn-ghost">
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">生成ブリーフ</h2>
          {submitted && (
            <button onClick={copy} className="btn btn-ghost text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-brand-glow" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "コピー済み" : "コピー"}
            </button>
          )}
        </div>
        {submitted ? (
          <pre className="text-xs p-3 rounded overflow-auto max-h-[600px] whitespace-pre-wrap font-mono" style={{ background: "var(--hover)" }}>{submitted}</pre>
        ) : (
          <div className="text-sm text-[var(--fg-muted)] py-12 text-center">
            <Wand2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>左のフォームから入力後、<br />生成ボタンを押してください</p>
            <p className="text-xs mt-3 opacity-75">生成されたブリーフは Claude Code に貼り付けて担当エージェントに実出力を依頼できます。</p>
          </div>
        )}
      </div>
    </div>
  );
}
