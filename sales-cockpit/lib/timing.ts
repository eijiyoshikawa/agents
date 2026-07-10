// アポ・架電タイミング分析。
//
// 架電記録（結果つき）を JST の曜日 × 時間帯でバケット化し、
// 「どの時間帯に何をさせると効率的か」を可視化するための集計を返す。
//   - 架電量:   その時間帯にどれだけ架電しているか（現状の行動分布）
//   - 接続率:   接続(通話成立)/架電 … 「電話がつながりやすい時間」
//   - アポ率:   アポ獲得/架電    … 「架電がアポに転換しやすい時間」
//   - アポ数:   アポ獲得の絶対数
//
// 注意: 時間帯を出せるのは「架電日時に時刻が入っている行」だけ。
//   アプリの架電記録は full ISO(時刻つき)で保存されるため対象になるが、
//   日付だけ(YYYY-MM-DD)の行は時間帯不明として除外する（9時への偏り誤解を防ぐ）。
import type { CallEvent } from "./types";
import { jstDowHour, jstDateKey } from "./period";

// "2026-07-03T14:20:00+09:00" のように時刻(T\d\d:)を含むか
const HAS_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:/;
// 率(接続率・アポ率)を「意味のある値」として表示する最小母数（架電数）
export const MIN_SAMPLE = 3;

export type Grid = {
  matrix: number[][]; // [dow 0-6][hour 0-23]
  byDow: number[]; // len 7
  byHour: number[]; // len 24
  total: number;
  max: number; // 最大セル値（濃淡の基準）
};

export type CountSlot = { dow: number; hour: number; count: number };
export type RateSlot = { dow: number; hour: number; rate: number; num: number; den: number };

export type TimingBoard = {
  hourStart: number;
  hourEnd: number;
  calls: Grid;
  connected: Grid;
  appts: Grid;
  excludedNoTime: number;
  firstDate: string | null;
  lastDate: string | null;
  insights: {
    peakCall: CountSlot | null; // 最も架電している枠
    peakAppt: CountSlot | null; // 最もアポが取れている枠
    bestConnect: RateSlot | null; // 最も接続しやすい枠（母数MIN_SAMPLE以上）
    bestAppt: RateSlot | null; // 最もアポ転換しやすい枠（母数MIN_SAMPLE以上）
    lowVolumeHours: number[]; // 架電が薄い時間帯（営業時間内で下位）
  };
};

function emptyGrid(): Grid {
  return {
    matrix: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    byDow: new Array(7).fill(0),
    byHour: new Array(24).fill(0),
    total: 0,
    max: 0,
  };
}

function finalizeGrid(g: Grid): void {
  let max = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) if (g.matrix[d][h] > max) max = g.matrix[d][h];
  }
  g.max = max;
}

export function rateAt(numGrid: Grid, denGrid: Grid, dow: number, hour: number): number | null {
  const den = denGrid.matrix[dow][hour];
  if (den < MIN_SAMPLE) return null;
  return numGrid.matrix[dow][hour] / den;
}

function emptyBoard(excludedNoTime = 0): TimingBoard {
  return {
    hourStart: 9,
    hourEnd: 19,
    calls: emptyGrid(),
    connected: emptyGrid(),
    appts: emptyGrid(),
    excludedNoTime,
    firstDate: null,
    lastDate: null,
    insights: { peakCall: null, peakAppt: null, bestConnect: null, bestAppt: null, lowVolumeHours: [] },
  };
}

function peakSlot(g: Grid): CountSlot | null {
  let best: CountSlot | null = null;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const c = g.matrix[d][h];
      if (c > 0 && (!best || c > best.count)) best = { dow: d, hour: h, count: c };
    }
  }
  return best;
}

// den(母数)が MIN_SAMPLE 以上のセルの中で num/den 最大の枠
function bestRateSlot(numGrid: Grid, denGrid: Grid): RateSlot | null {
  let best: RateSlot | null = null;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const den = denGrid.matrix[d][h];
      if (den < MIN_SAMPLE) continue;
      const rate = numGrid.matrix[d][h] / den;
      if (!best || rate > best.rate || (rate === best.rate && den > best.den)) {
        best = { dow: d, hour: h, rate, num: numGrid.matrix[d][h], den };
      }
    }
  }
  return best;
}

export function buildTimingBoard(events: CallEvent[]): TimingBoard {
  const calls = emptyGrid();
  const connected = emptyGrid();
  const appts = emptyGrid();
  let excludedNoTime = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  const bump = (g: Grid, d: number, h: number) => {
    g.matrix[d][h]++;
    g.byDow[d]++;
    g.byHour[h]++;
    g.total++;
  };

  for (const c of events) {
    if (!c.date) continue;
    if (!HAS_TIME.test(c.date)) {
      // 時刻不明。アポだけは「除外した」件数として通知（架電の分母は時刻必須なので黙って無視）。
      if (c.isAppointment) excludedNoTime++;
      continue;
    }
    const p = jstDowHour(c.date);
    if (!p) continue;
    bump(calls, p.dow, p.hour);
    if (c.isConnected) bump(connected, p.dow, p.hour);
    if (c.isAppointment) bump(appts, p.dow, p.hour);
    const day = jstDateKey(c.date);
    if (day) {
      if (!firstDate || day < firstDate) firstDate = day;
      if (!lastDate || day > lastDate) lastDate = day;
    }
  }

  if (calls.total === 0) return emptyBoard(excludedNoTime);
  finalizeGrid(calls);
  finalizeGrid(connected);
  finalizeGrid(appts);

  // 表示する時間帯レンジ（架電がある最小〜最大時）
  let hourStart = 24;
  let hourEnd = 0;
  for (let h = 0; h < 24; h++) {
    if (calls.byHour[h] > 0) {
      hourStart = Math.min(hourStart, h);
      hourEnd = Math.max(hourEnd, h);
    }
  }
  if (hourStart > hourEnd) {
    hourStart = 9;
    hourEnd = 19;
  }

  // 架電が薄い時間帯（レンジ内で架電のある時間のうち下位3つ）
  const hoursWithCalls = [];
  for (let h = hourStart; h <= hourEnd; h++) if (calls.byHour[h] > 0) hoursWithCalls.push(h);
  const lowVolumeHours = [...hoursWithCalls]
    .sort((a, b) => calls.byHour[a] - calls.byHour[b])
    .slice(0, 3)
    .sort((a, b) => a - b);

  return {
    hourStart,
    hourEnd,
    calls,
    connected,
    appts,
    excludedNoTime,
    firstDate,
    lastDate,
    insights: {
      peakCall: peakSlot(calls),
      peakAppt: peakSlot(appts),
      bestConnect: bestRateSlot(connected, calls),
      bestAppt: bestRateSlot(appts, calls),
      lowVolumeHours,
    },
  };
}

export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
// 表示は月曜始まり（週次レポートと揃える）
export const DOW_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function slotLabel(dow: number, hour: number): string {
  return `${WEEKDAY_JA[dow]}曜 ${hour}時台`;
}
