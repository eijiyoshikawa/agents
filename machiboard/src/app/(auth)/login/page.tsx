"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("送信に失敗しました。もう一度お試しください。");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="size-16 text-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">
          メールを送信しました
        </h1>
        <p className="text-lg text-neutral-700">
          <strong>{email}</strong> にログインリンクを送信しました。
          メールを開いてリンクをタップしてください。
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-primary-500 underline text-lg"
        >
          別のメールアドレスで試す
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-primary-700">まちボード</h1>
        <p className="text-lg text-neutral-700">
          回覧板を、もっとかんたんに。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="メールアドレス"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />

        <Button type="submit" fullWidth loading={loading}>
          <Mail className="size-5" aria-hidden="true" />
          ログインリンクを送信
        </Button>
      </form>

      <p className="text-base text-center text-neutral-500">
        パスワードは不要です。メールアドレスだけでログインできます。
      </p>
    </div>
  );
}
