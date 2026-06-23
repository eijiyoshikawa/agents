import Spinner from "@/components/Spinner";

// 各ページのサーバー側 Notion 取得中に表示されるローディング。
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fadeIn">
      <Spinner />
      <p className="text-sm text-ink-muted animate-pulse">Notion からデータを読み込み中…</p>
    </div>
  );
}
