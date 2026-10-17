import clsx from "clsx";

/**
 * スケルトンローディングの部品集。各ページの loading.tsx（App Routerが
 * サーバー取得中に自動表示）と、クライアント側のフェッチ待ちで共用する。
 * 幅は固定配列で決める（Math.random はSSR/CSRで不一致になるため使わない）。
 */
export function Sk({ className }: { className?: string }) {
  return <div className={clsx("rounded-lg bg-white/[0.07] animate-pulse", className)} aria-hidden />;
}

/** ページタイトル部分 */
export function SkTitle() {
  return (
    <div className="space-y-2">
      <Sk className="h-6 w-56" />
      <Sk className="h-3 w-80 max-w-full" />
    </div>
  );
}

/** フィルタ・タブのチップ列 */
export function SkChips({ count = 5 }: { count?: number }) {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-24", "w-36", "w-20", "w-28"];
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Sk key={i} className={clsx("h-8", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** KPIカードのグリッド */
export function SkKpis({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <Sk className="h-3 w-20" />
          <Sk className="h-7 w-28" />
          <Sk className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** テーブル（ヘッダー + 行）。行ごとに幅を変えて「表らしさ」を出す */
export function SkTable({ rows = 10 }: { rows?: number }) {
  const nameW = ["w-40", "w-56", "w-48", "w-36", "w-52", "w-44", "w-60", "w-40", "w-48", "w-56", "w-44", "w-52"];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-3 border-b border-white/10">
        <Sk className="h-3 w-24" />
        <Sk className="h-3 w-16" />
        <Sk className="h-3 w-12" />
        <Sk className="h-3 w-16 hidden sm:block" />
        <Sk className="h-3 w-14 hidden md:block" />
        <Sk className="h-3 w-12 ml-auto" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3 border-b border-white/[0.06]">
          <Sk className={clsx("h-4", nameW[i % nameW.length])} />
          <Sk className="h-4 w-16" />
          <Sk className="h-4 w-10" />
          <Sk className="h-4 w-20 hidden sm:block" />
          <Sk className="h-4 w-14 hidden md:block" />
          <Sk className="h-7 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** グラフ風ブロック */
export function SkChart({ className }: { className?: string }) {
  return (
    <div className={clsx("card p-4 space-y-3", className)}>
      <Sk className="h-4 w-32" />
      <div className="flex items-end gap-2 h-40">
        {["h-16", "h-24", "h-20", "h-32", "h-28", "h-36", "h-24", "h-40", "h-32", "h-28", "h-36", "h-20"].map(
          (h, i) => (
            <Sk key={i} className={clsx("flex-1", h)} />
          ),
        )}
      </div>
    </div>
  );
}

/** 一覧ページ用の標準スケルトン（タイトル + フィルタ + テーブル） */
export function SkListPage({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <SkTitle />
      <SkChips count={6} />
      <SkTable rows={rows} />
    </div>
  );
}

/** ダッシュボード等の集計ページ用（タイトル + KPI + グラフ + テーブル） */
export function SkDashboardPage() {
  return (
    <div className="space-y-5 animate-fadeIn">
      <SkTitle />
      <SkKpis count={4} />
      <div className="grid lg:grid-cols-2 gap-4">
        <SkChart />
        <SkChart />
      </div>
      <SkTable rows={5} />
    </div>
  );
}
