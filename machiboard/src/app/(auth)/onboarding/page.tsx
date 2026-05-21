"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Users, Bell, ArrowRight, Plus } from "lucide-react";

type Step = "name" | "organization" | "notifications";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [mode, setMode] = useState<"join" | "create" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
      });
    }

    setLoading(false);
    setStep("organization");
  }

  async function handleJoinOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    const res = await fetch("/api/organizations/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "参加に失敗しました");
      return;
    }

    toast.success(`${data.organization.name} に参加しました`);
    setStep("notifications");
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("ログインが必要です");
      setLoading(false);
      return;
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .insert({ name: orgName.trim(), type: "自治会" as const })
      .select()
      .single();

    if (error || !org) {
      toast.error("組織の作成に失敗しました");
      setLoading(false);
      return;
    }

    await supabase.from("memberships").insert({
      user_id: user.id,
      organization_id: org.id,
      role: "admin",
    });

    setLoading(false);
    toast.success(`${orgName} を作成しました（管理者として登録）`);
    setStep("notifications");
  }

  async function handleComplete() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    router.push("/");
  }

  const stepIndex = step === "name" ? 1 : step === "organization" ? 2 : 3;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-primary-700">はじめての設定</h1>
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-2 rounded-full ${i <= stepIndex ? "bg-primary-500" : "bg-neutral-200"}`}
              role="presentation"
            />
          ))}
        </div>
        <p className="text-base text-neutral-500">ステップ {stepIndex} / 3</p>
      </div>

      {step === "name" && (
        <form onSubmit={handleNameSubmit} className="space-y-6">
          <div className="text-center space-y-2">
            <User className="size-12 text-primary-500 mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold">お名前を教えてください</h2>
            <p className="text-base text-neutral-500">回覧板の確認一覧に表示されます</p>
          </div>
          <Input
            label="お名前"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 田中 義男"
            required
            autoFocus
          />
          <Button type="submit" fullWidth loading={loading}>
            次へ <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </form>
      )}

      {step === "organization" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Users className="size-12 text-primary-500 mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold">組織に参加</h2>
            <p className="text-base text-neutral-500">招待コードで参加するか、新しく作成します</p>
          </div>

          {!mode && (
            <div className="space-y-3">
              <Card className="cursor-pointer hover:bg-primary-50 transition-colors" onClick={() => setMode("join")}>
                <div className="flex items-center gap-4 p-2">
                  <Users className="size-8 text-primary-500 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">招待コードで参加</p>
                    <p className="text-base text-neutral-500">管理者から受け取ったコードを入力</p>
                  </div>
                </div>
              </Card>
              <Card className="cursor-pointer hover:bg-primary-50 transition-colors" onClick={() => setMode("create")}>
                <div className="flex items-center gap-4 p-2">
                  <Plus className="size-8 text-secondary-500 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-bold">新しく組織を作成</p>
                    <p className="text-base text-neutral-500">自治会・町内会を新規登録</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoinOrg} className="space-y-4">
              <Input
                label="招待コード"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="例: ab12cd34"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setMode(null)}>戻る</Button>
                <Button type="submit" fullWidth loading={loading}>参加する</Button>
              </div>
            </form>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <Input
                label="組織名"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="例: ○○町内会"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setMode(null)}>戻る</Button>
                <Button type="submit" fullWidth loading={loading}>作成する</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === "notifications" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Bell className="size-12 text-primary-500 mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold">通知を設定</h2>
            <p className="text-base text-neutral-500">
              新しいお知らせが届いたときに通知を受け取れます
            </p>
          </div>
          <Button fullWidth onClick={handleComplete}>
            まちボードを始める <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
