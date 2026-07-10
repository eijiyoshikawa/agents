// アポ獲得タイミング分析。
//
// 「結果＝アポイント獲得」の架電記録を、JSTの曜日 × 時間帯でバケット化し、
// 何曜日の何時ごろにアポを獲得しやすいかを可視化する。
//
// 注意: 集計に使えるのは「架電日時に時刻が入っている行」だけ。
//   アプリからの架電記録は full ISO(時刻つき)で保存されるため対象になるが、
//   日付だけ(YYYY-MM-DD)の行は時間帯が不明なので除外する（9時に偏る誤解を防ぐ）。
import type { CallEvent } from "./types";
import { jstDowHour, jstDateKey } from "./period";

// "2026-07-03T14:20:00+09:00" のように時刻(T\d\d:)を含むか
const HAS_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:/;

export type ApptSlot = { dow: number; hour: number; count: number };

export type ApptTiming = {
  matrix: number[][]; // [dow 0-6][hour 0-23] のアポ獲得件数
  byDow: number[]; // 曜日別合計（len 7, 0=日..6=土）
  byHour: number[]; // 時間帯別合計（len 24）
  total: number; // 時刻つきで集計できたアポ数
  excludedNoTime: number; // 時刻が無く集計から除外したアポ数
  maxCell: number; // ヒートマップ最大セル値（濃淡の基準）
  hourStart: number; // データがある最小時（表示範囲の圧縮用）
  hourEnd: number; // データがある最大時
  peakDow: number | null; // 最も多い曜日
  peakHour: number | null; // 最も多い時間帯
  topSlots: ApptSlot[]; // 獲得が多い「曜日×時間」上位
  firstDate: string | null; // 集計対象の最古日 YYYY-MM-DD(JST)
  lastDate: string | null; // 集計対象の最新日
};

function emptyTiming(excludedNoTime = 0): ApptTiming {
  return {
    matrix: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    byDow: new Array(7).fill(0),
    byHour: new Array(24).fill(0),
    total: 0,
    excludedNoTime,
    maxCell: 0,
    hourStart: 9,
    hourEnd: 19,
    peakDow: null,
    peakHour: null,
    topSlots: [],
    firstDate: null,
    lastDate: null,
  };
}

function argmax(arr: number[]): number | null {
  let best = -1;
  let idx: number | null = null;
  arr.forEach((v, i) => {
    if (v > best) {
      best = v;
      idx = i;
    }
  });
  return best > 0 ? idx : null;
}

/** アポ獲得の架電を 曜日 × 時間帯 に集計する（純粋関数）。 */
export function buildApptTiming(calls: CallEvent[]): ApptTiming {
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const byDow = new Array(7).fill(0);
  const byHour = new Array(24).fill(0);
  let total = 0;
  let excludedNoTime = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const c of calls) {
    if (!c.isAppointment || !c.date) continue;
    if (!HAS_TIME.test(c.date)) {
      excludedNoTime++;
      continue;
    }
    const p = jstDowHour(c.date);
    if (!p) continue;
    matrix[p.dow][p.hour]++;
    byDow[p.dow]++;
    byHour[p.hour]++;
    total++;
    const day = jstDateKey(c.date);
    if (day) {
      if (!firstDate || day < firstDate) firstDate = day;
      if (!lastDate || day > lastDate) lastDate = day;
    }
  }

  if (total === 0) return emptyTiming(excludedNoTime);

  let maxCell = 0;
  const slots: ApptSlot[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = matrix[d][h];
      if (v > 0) {
        slots.push({ dow: d, hour: h, count: v });
        if (v > maxCell) maxCell = v;
      }
    }
  }
  slots.sort((a, b) => b.count - a.count || a.dow - b.dow || a.hour - b.hour);

  let hourStart = 24;
  let hourEnd = 0;
  for (let h = 0; h < 24; h++) {
    if (byHour[h] > 0) {
      hourStart = Math.min(hourStart, h);
      hourEnd = Math.max(hourEnd, h);
    }
  }
  if (hourStart > hourEnd) {
    hourStart = 9;
    hourEnd = 19;
  }

  return {
    matrix,
    byDow,
    byHour,
    total,
    excludedNoTime,
    maxCell,
    hourStart,
    hourEnd,
    peakDow: argmax(byDow),
    peakHour: argmax(byHour),
    topSlots: slots.slice(0, 5),
    firstDate,
    lastDate,
  };
}

export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
// 表示は月曜始まり（週次レポートと揃える）
export const DOW_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
