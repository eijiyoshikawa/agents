import { getStoredTargets, fetchRepOptions, getCallTargets } from "@/lib/notion";
import { currentMonthKey } from "@/lib/period";
import TargetsForm from "@/components/TargetsForm";
import CallTargetGrid from "@/components/CallTargetGrid";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function TargetsSettingsPage() {
  const month = currentMonthKey(); // 当月（暦月・1日〜末日）

  const [initial, reps, gridData] = await Promise.all([
    getStoredTargets().catch(() => null),
    fetchRepOptions().catch(() => [] as string[]),
    getCallTargets("日次", month).catch(() => ({})),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-ink">目標設定</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          ここで設定した目標が、ダッシュボードの「目標達成状況」と担当者別の達成率に反映されます。
        </p>
      </div>
      <TargetsForm initial={initial} />
      <CallTargetGrid reps={reps} initialType="日次" initialMonth={month} initialData={gridData} />
    </div>
  );
}
