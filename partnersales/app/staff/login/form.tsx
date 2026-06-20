"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--card-border)", background: "var(--card)", color: "var(--fg)", fontSize: 14,
};

export default function StaffLoginForm() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "ログインに失敗しました");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="h-section">合言葉</span>
        <input style={input} type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required />
      </label>
      {error && <div className="pill pill-red" style={{ alignSelf: "start" }}>{error}</div>}
      <button className="btn btn-primary" disabled={busy} style={{ justifyContent: "center" }}>
        {busy ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
