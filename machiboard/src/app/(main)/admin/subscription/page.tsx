"use client";

import { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function SubscriptionPageWrapper() {
  return (
    <Suspense fallback={<div className="h-64 bg-neutral-100 rounded-xl animate-pulse" />}>
      <SubscriptionPage />
    </Suspense>
  );
}

const PLANS = [
  {
    tier: "mini",
    name: "ミニ",
    price: "3,000",
    target: "100世帯以下",
    lookup_key: "machiboard_mini_monthly",
    features: ["回覧板投稿・既読確認", "プッシュ通知・メール通知", "PDF自動生成", "管理者5名まで"],
  },
  {
    tier: "standard",
    name: "スタンダード",
    price: "8,000",
    target: "101-500世帯",
    lookup_key: "machiboard_standard_monthly",
    popular: true,
    features: ["ミニの全機能", "多言語対応（5言語）", "防災モード", "カレンダー・アンケート", "管理者20名まで", "優先サポート"],
  },
  {
    tier: "premium",
    name: "プレミアム",
    price: "30,000〜",
    target: "501世帯以上",
    lookup_key: "machiboard_premium_monthly",
    features: ["スタンダードの全機能", "管理者無制限", "API連携", "カスタムブランディング", "専任サポート", "SLA 99.9%"],
  },
];

function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [currentTier, setCurrentTier] = useState("free");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success")) toast.success("プランに登録しました");
    if (searchParams.get("canceled")) toast.info("プラン変更をキャンセルしました");

    async function fetchSubscription() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id, organization:organizations(subscription_tier)")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (membership) {
        setOrgId(membership.organization_id);
        const org = Array.isArray(membership.organization)
          ? membership.organization[0]
          : membership.organization;
        setCurrentTier(org?.subscription_tier ?? "free");
      }
    }

    fetchSubscription();
  }, [searchParams]);

  async function handleCheckout(lookupKey: string) {
    if (!orgId) return;
    setLoading(lookupKey);

    const res = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookup_key: lookupKey, organization_id: orgId }),
    });

    const data = await res.json();
    setLoading(null);

    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "エラーが発生しました");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">プラン管理</h1>

      {currentTier === "free" && (
        <Card className="bg-secondary-50 border border-secondary-500">
          <p className="text-lg font-semibold text-secondary-700">
            無料トライアル中 — 3ヶ月間すべての機能をお試しいただけます
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.tier}
            className={`relative ${plan.popular ? "border-2 border-primary-500" : ""} ${currentTier === plan.tier ? "bg-primary-50" : ""}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-4 bg-primary-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                おすすめ
              </span>
            )}

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
                  <p className="text-base text-neutral-500">{plan.target}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-900">
                    ¥{plan.price}
                    <span className="text-base font-normal text-neutral-500">/月</span>
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-base text-neutral-700">
                    <Check className="size-5 text-success shrink-0" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>

              {currentTier === plan.tier ? (
                <Button variant="outline" fullWidth disabled>
                  <Crown className="size-5" aria-hidden="true" /> 現在のプラン
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant={plan.popular ? "primary" : "outline"}
                  loading={loading === plan.lookup_key}
                  onClick={() => handleCheckout(plan.lookup_key)}
                >
                  このプランに申し込む
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
