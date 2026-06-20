"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { registerPartner, hasBrowserSupabase, type RegisterResult } from "@/lib/db/register";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--card-border)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 14,
};

export default function RegisterForm() {
  const [configured, setConfigured] = useState(true);
  const [name, setName] = useState("");
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [referrerCode, setReferrerCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);

  // クライアントでのみ環境設定の有無を判定（ビルド時は常にフォーム表示）
  useEffect(() => {
    setConfigured(hasBrowserSupabase());
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferrerCode(ref);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerPartner({
        name,
        person: person || undefined,
        email: email || undefined,
        referrerCode: referrerCode || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return (
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
          <CheckCircle2 size={20} /> <strong>登録が完了しました</strong>
        </div>
        <div>
          <div className="h-section">あなたの招待コード</div>
          <code style={{ fontSize: 18 }}>{result.referralCode}</code>
        </div>
        <div>
          <div className="h-section">あなたの個別ページ</div>
          <Link href={`/partners/${result.slug}`}>{`${base}/partners/${result.slug}`}</Link>
          <p style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 4 }}>
            ※ 静的サイトのため、新規ページは次回のビルド・デプロイ後に表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 14 }}>
      {!configured && (
        <div className="pill pill-amber" style={{ alignSelf: "start" }}>
          <AlertTriangle size={12} /> Supabase 未設定（デモ表示）。docs/RUNBOOK.md を参照
        </div>
      )}
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">会社名 *</span>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="株式会社サンプル" />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">担当者名</span>
        <input style={inputStyle} value={person} onChange={(e) => setPerson(e.target.value)} placeholder="山田太郎" />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">メールアドレス</span>
        <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="taro@example.com" />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">紹介元の招待コード（任意）</span>
        <input style={inputStyle} value={referrerCode} onChange={(e) => setReferrerCode(e.target.value)} placeholder="ACME-7K3Q" />
      </label>
      {error && <div className="pill pill-red" style={{ alignSelf: "start" }}>{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={submitting || !configured} style={{ justifyContent: "center" }}>
        {submitting ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}
