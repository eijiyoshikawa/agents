import Link from "next/link";
import { getCustomers } from "@/lib/data";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function QualityPage() {
  const { customers, errors } = await getCustomers();
  const total = customers.length;

  const noPhone = customers.filter((c) => !c.phone).length;
  const noIndustry = customers.filter((c) => !c.industry).length;
  const noRep = customers.filter((c) => !c.isRep).length;
  const noStatus = customers.filter((c) => !c.status).length;
  const unconfirmed = customers.filter((c) => c.confirm === "未確認").length;
  const markedDup = customers.filter((c) => c.confirm === "重複（統合/既存に追記）").length;

  const items = [
    { label: "電話番号なし", value: noPhone, href: "/calls" },
    { label: "業種 未設定", value: noIndustry, href: "/calls" },
    { label: "IS担当 未設定", value: noRep, href: "/calls" },
    { label: "ステータス未設定", value: noStatus, href: "/calls" },
    { label: "確認状況：未確認", value: unconfirmed, href: "/duplicates" },
    { label: "重複マーク済", value: markedDup, href: "/duplicates" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">データ品質</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          顧客データ {num(total)} 件の入力状況。欠損項目を把握し、入力ルールの徹底に活用してください。
        </p>
      </div>

      {errors.length > 0 && (
        <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{errors.join(" / ")}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => {
          const ratio = total > 0 ? Math.round((it.value / total) * 100) : 0;
          return (
            <Link key={it.label} href={it.href} className="card p-4 hover:ring-white/20 transition-shadow">
              <div className="text-xs font-medium text-ink-muted">{it.label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(it.value)}</div>
              <div className="mt-0.5 text-xs text-ink-muted">全体の {ratio}%</div>
            </Link>
          );
        })}
      </div>

      <div className="card p-4 text-xs text-ink-soft">
        推奨ルール：新規登録時に「顧客名・電話番号・業種・住所」を必須化。架電後は必ずステータスを更新（架電リストの「架電結果を記録」を使用）。
        重複は「重複」ページで確認→マーク。
      </div>
    </div>
  );
}
