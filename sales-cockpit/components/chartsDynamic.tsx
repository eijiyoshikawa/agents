"use client";

import dynamic from "next/dynamic";

// recharts は重い（初回バンドルを圧迫）ため、クライアントで遅延ロードする。
// 表示まで高さ分のスケルトンを出してレイアウトシフトを防ぐ。
function Skeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]"
      style={{ height }}
    />
  );
}

export const CallsChart = dynamic(() => import("./charts").then((m) => m.CallsChart), {
  ssr: false,
  loading: () => <Skeleton height={280} />,
});

export const MrrChart = dynamic(() => import("./charts").then((m) => m.MrrChart), {
  ssr: false,
  loading: () => <Skeleton height={260} />,
});

export const FunnelChart = dynamic(() => import("./charts").then((m) => m.FunnelChart), {
  ssr: false,
  loading: () => <Skeleton height={260} />,
});

export const CategoryBar = dynamic(() => import("./charts").then((m) => m.CategoryBar), {
  ssr: false,
  loading: () => <Skeleton height={260} />,
});

export const TargetChart = dynamic(() => import("./charts").then((m) => m.TargetChart), {
  ssr: false,
  loading: () => <Skeleton height={280} />,
});
