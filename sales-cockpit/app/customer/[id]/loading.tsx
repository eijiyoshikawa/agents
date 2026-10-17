import { Sk, SkTitle } from "@/components/Skeleton";

// 顧客詳細（企業情報）のサーバー取得中スケルトン。
export default function Loading() {
  return (
    <div className="max-w-3xl space-y-4 animate-fadeIn">
      <Sk className="h-8 w-24" />
      <SkTitle />
      <div className="card p-5 space-y-4">
        <Sk className="h-20 w-full" />
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Sk key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex gap-2">
          <Sk className="h-8 w-24" />
          <Sk className="h-8 w-28" />
          <Sk className="h-8 w-32" />
        </div>
        <Sk className="h-24 w-full" />
      </div>
    </div>
  );
}
