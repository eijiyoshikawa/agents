"use client";
import { useEffect, useRef, useState } from "react";

export default function AnimatedCounter({ value, duration = 900, suffix = "" }: { value: number | string; duration?: number; suffix?: string }) {
  const numeric = typeof value === "number" ? value : parseFloat(String(value));
  const isNumber = Number.isFinite(numeric);
  const [display, setDisplay] = useState(isNumber ? 0 : value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isNumber) { setDisplay(value); return; }
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(numeric * eased * 100) / 100);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, numeric, isNumber]);

  return <span>{display}{suffix}</span>;
}
