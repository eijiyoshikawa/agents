import { getStoredTargets } from "@/lib/notion";
import TargetsForm from "@/components/TargetsForm";

export const dynamic = "force-dynamic";

export default async function TargetsSettingsPage() {
  let initial = null;
  try {
    initial = await getStoredTargets();
  } catch {
    initial = null;
  }
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-ink">目標設定</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          ここで設定した目標が、ダッシュボードの「目標達成状況」と担当者別の達成率に反映されます。
        </p>
      </div>
      <TargetsForm initial={initial} />
    </div>
  );
}
