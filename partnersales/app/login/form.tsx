"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getBrowserClient, hasBrowserSupabase } from "@/lib/db/supabase";

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--fg)", fontSize: 14,
};

export default function LoginForm() {
  const router = useRouter();
  const [configured, setConfigured] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setConfigured(hasBrowserSupabase()), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await getBrowserClient().rpc("partner_login", {
        p_login_id: loginId,
        p_password: password,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.slug) throw new Error("ログインに失敗しました");
      sessionStorage.setItem("ps_partner", JSON.stringify(row));
      router.push(`/partners/${row.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 12 }}>
      {!configured && (
        <div className="pill pill-amber" style={{ alignSelf: "start" }}>
          <AlertTriangle size={12} /> Supabase 未設定（demo）。docs/RUNBOOK.md 参照
        </div>
      )}
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">ログインID</span>
        <input style={input} value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="LET-P-0001" required />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">パスワード</span>
        <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div className="pill pill-red" style={{ alignSelf: "start" }}>{error}</div>}
      <button className="btn btn-primary" disabled={busy || !configured} style={{ justifyContent: "center" }}>
        {busy ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
