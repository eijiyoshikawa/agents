import type { CSSProperties } from "react";
import { WEEKDAY_JA, DOW_DISPLAY_ORDER } from "@/lib/timing";

export type HeatCell = { intensity: number; text: string; title: string };

/** 曜日(行:月〜日) × 時間帯(列) のヒートマップ。サーバーコンポーネント（静的描画）。 */
export default function Heatmap({
  hours,
  accent,
  getCell,
  rowTotal,
  colTotal,
  grandTotal,
}: {
  hours: number[];
  accent: [number, number, number];
  getCell: (dow: number, hour: number) => HeatCell;
  rowTotal?: (dow: number) => string;
  colTotal?: (hour: number) => string;
  grandTotal?: string;
}) {
  const [r, g, b] = accent;
  const style = (intensity: number): CSSProperties => {
    if (intensity <= 0) return { backgroundColor: "rgba(255,255,255,0.03)" };
    const a = 0.08 + 0.9 * Math.min(1, intensity);
    return { backgroundColor: `rgba(${r},${g},${b},${a.toFixed(3)})` };
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="text-[11px] text-ink-muted font-medium px-2"></th>
            {hours.map((h) => (
              <th key={h} className="text-[11px] text-ink-muted font-medium w-11">
                {h}時
              </th>
            ))}
            {rowTotal && <th className="text-[11px] text-ink-muted font-medium px-2">計</th>}
          </tr>
        </thead>
        <tbody>
          {DOW_DISPLAY_ORDER.map((d) => (
            <tr key={d}>
              <td className="text-xs text-ink-soft font-medium pr-2 whitespace-nowrap">{WEEKDAY_JA[d]}曜</td>
              {hours.map((h) => {
                const c = getCell(d, h);
                return (
                  <td
                    key={h}
                    style={style(c.intensity)}
                    className="w-11 h-9 rounded-md text-[11px] text-ink tabular-nums align-middle"
                    title={c.title}
                  >
                    {c.text}
                  </td>
                );
              })}
              {rowTotal && (
                <td className="text-xs text-ink-soft font-semibold tabular-nums pl-2">{rowTotal(d)}</td>
              )}
            </tr>
          ))}
          {colTotal && (
            <tr>
              <td className="text-[11px] text-ink-muted pr-2">計</td>
              {hours.map((h) => (
                <td key={h} className="text-[11px] text-ink-muted font-medium tabular-nums">
                  {colTotal(h)}
                </td>
              ))}
              <td className="text-xs text-ink font-bold tabular-nums pl-2">{grandTotal ?? ""}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
