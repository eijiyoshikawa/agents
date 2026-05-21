"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Shield, User } from "lucide-react";
import { toast } from "sonner";
import type { Membership } from "@/lib/types/database";

export default function MembersPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!membership) return;

      const { data } = await supabase
        .from("memberships")
        .select("*, profile:profiles(*)")
        .eq("organization_id", membership.organization_id)
        .order("joined_at", { ascending: true });

      setMembers(data ?? []);
      setLoading(false);
    }

    fetchMembers();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    // In production, this would send an invitation email
    toast.success(`${inviteEmail} に招待メールを送信しました`);
    setInviteEmail("");
    setInviting(false);
  }

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">メンバー管理</h1>

      <Card>
        <form onSubmit={handleInvite} className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">メンバーを招待</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="メールアドレス"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={inviting}>
                <UserPlus className="size-5" aria-hidden="true" />
                招待
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">
          メンバー一覧（{members.length}名）
        </h2>
        {members.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-10 rounded-full ${m.role === "admin" ? "bg-primary-100" : "bg-neutral-100"}`}>
                  {m.role === "admin" ? (
                    <Shield className="size-5 text-primary-700" aria-hidden="true" />
                  ) : (
                    <User className="size-5 text-neutral-500" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-neutral-900">
                    {m.profile?.display_name ?? "未設定"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {m.role === "admin" ? "管理者" : "メンバー"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
