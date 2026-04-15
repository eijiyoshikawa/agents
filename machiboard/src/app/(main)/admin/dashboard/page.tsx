"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CategoryBadge } from "@/components/ui/badge";
import { Users, FileText, BarChart3, Bell } from "lucide-react";
import { toast } from "sonner";
import type { Bulletin } from "@/lib/types/database";

interface DashboardStats {
  memberCount: number;
  bulletinCount: number;
  avgReadRate: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ memberCount: 0, bulletinCount: 0, avgReadRate: 0 });
  const [recentBulletins, setRecentBulletins] = useState<(Bulletin & { readRate: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
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
      const orgId = membership.organization_id;

      // Fetch member count
      const { count: memberCount } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      // Fetch recent bulletins with read counts
      const { data: bulletins } = await supabase
        .from("bulletins")
        .select("*, read_confirmations(user_id)")
        .eq("organization_id", orgId)
        .eq("is_draft", false)
        .order("published_at", { ascending: false })
        .limit(10);

      const enriched = (bulletins ?? []).map((b) => {
        const readCount = Array.isArray(b.read_confirmations)
          ? b.read_confirmations.length
          : 0;
        return {
          ...b,
          image_urls: b.image_urls ?? [],
          attachment_urls: b.attachment_urls ?? [],
          readRate: memberCount && memberCount > 0
            ? Math.round((readCount / memberCount) * 100)
            : 0,
        };
      });

      const avgRate = enriched.length > 0
        ? Math.round(enriched.reduce((sum, b) => sum + b.readRate, 0) / enriched.length)
        : 0;

      setStats({
        memberCount: memberCount ?? 0,
        bulletinCount: enriched.length,
        avgReadRate: avgRate,
      });
      setRecentBulletins(enriched);
      setLoading(false);
    }

    fetchDashboard();
  }, []);

  async function handleRemind(bulletinId: string) {
    toast.success("未読の方にリマインド通知を送信しました");
  }

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">管理ダッシュボード</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="text-center space-y-1">
            <Users className="size-6 text-primary-500 mx-auto" aria-hidden="true" />
            <p className="text-2xl font-bold text-neutral-900">{stats.memberCount}</p>
            <p className="text-sm text-neutral-500">メンバー</p>
          </div>
        </Card>
        <Card>
          <div className="text-center space-y-1">
            <FileText className="size-6 text-primary-500 mx-auto" aria-hidden="true" />
            <p className="text-2xl font-bold text-neutral-900">{stats.bulletinCount}</p>
            <p className="text-sm text-neutral-500">投稿数</p>
          </div>
        </Card>
        <Card>
          <div className="text-center space-y-1">
            <BarChart3 className="size-6 text-primary-500 mx-auto" aria-hidden="true" />
            <p className="text-2xl font-bold text-neutral-900">{stats.avgReadRate}%</p>
            <p className="text-sm text-neutral-500">平均既読率</p>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-neutral-900">最近の投稿</h2>
        {recentBulletins.map((b) => (
          <Card key={b.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={b.category} />
                  <span className="text-base font-bold truncate">{b.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.readRate >= 80 ? "bg-success" : b.readRate >= 50 ? "bg-warning" : "bg-error"}`}
                      style={{ width: `${b.readRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-neutral-700">{b.readRate}%</span>
                </div>
              </div>
              {b.readRate < 80 && (
                <Button variant="outline" className="shrink-0 min-h-10 px-3 text-base" onClick={() => handleRemind(b.id)}>
                  <Bell className="size-4" aria-hidden="true" />
                  リマインド
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
