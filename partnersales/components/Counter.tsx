"use client";
import { useEffect, useRef, useState } from "react";

/** 数値をスロットカウンター風にカウントアップ表示する */
export default function Counter({
  value,
  prefix = "",
  suffix = "",
  duration = 900,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    // アクセシビリティ: モーション低減設定なら即時表示
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    const end = value;
    if (reduce || start === end) {
      setDisplay(end);
      from.current = end;
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className="stat-num" style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display.toLocaleString("ja-JP")}
      {suffix}
    </span>
  );
}
