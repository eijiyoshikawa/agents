"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, Input } from "@/components/AuthUI";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userId, password, code }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "登録失敗");
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message ?? "登録失敗");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="新規メンバー登録">
      <form onSubmit={submit} className="space-y-3">
        <Input label="表示名（例: 吉田）" value={name} onChange={setName} autoFocus />
        <Input label="ユーザーID（ログイン用）" value={userId} onChange={setUserId} />
        <Input label="パスワード（6文字以上）" type="password" value={password} onChange={setPassword} />
        <Input label="参加コード（社内共通）" value={code} onChange={setCode} />
        {err && <p className="text-sm text-accent-red">{err}</p>}
        <button
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          {loading ? "登録中…" : "登録してはじめる"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-muted text-center">
        既にアカウントがある方は{" "}
        <Link href="/login" className="text-brand-glow hover:underline">
          ログイン
        </Link>
      </p>
    </AuthShell>
  );
}
