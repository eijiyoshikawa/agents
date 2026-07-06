"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, Input } from "@/components/AuthUI";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "ログイン失敗");
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next;
    } catch (e: any) {
      setErr(e?.message ?? "ログイン失敗");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="ログイン">
      <form onSubmit={submit} className="space-y-3">
        <Input label="ユーザーID" value={userId} onChange={setUserId} autoFocus />
        <Input label="パスワード" type="password" value={password} onChange={setPassword} />
        {err && <p className="text-sm text-accent-red">{err}</p>}
        <button
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {loading ? "ログイン中…" : "ログイン"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-muted text-center">
        アカウントが無い方は{" "}
        <Link href="/signup" className="text-brand-glow hover:underline">
          新規登録
        </Link>
      </p>
    </AuthShell>
  );
}
