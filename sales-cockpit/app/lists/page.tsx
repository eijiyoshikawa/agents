import { cookies } from "next/headers";
import { listSavedLists, type SavedList } from "@/lib/notion";
import SavedListsClient from "@/components/SavedListsClient";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  let lists: SavedList[] = [];
  let error = "";
  try {
    void (await cookies()); // 認証は middleware 済み
    lists = await listSavedLists();
  } catch (e: any) {
    error = e?.message ?? "取得に失敗しました";
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">保存した架電リスト</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          架電リスト画面で保存した絞り込み条件の一覧です。「開く」で同じ条件の架電リストを表示します。
        </p>
      </div>
      {error && <div className="card p-4 ring-accent-amber/30 bg-accent-amber/5 text-xs text-ink-soft">{error}</div>}
      <SavedListsClient lists={lists} />
    </div>
  );
}
