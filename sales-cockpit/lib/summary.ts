// 日次/週次サマリの集計と Slack 整形。純粋関数（データ取得は呼び出し側）。
import type { ListCustomer, Contract, DashboardData } from "./types";
import { jstDateKey, monthLabel, monthRangeLabel, currentMonthKey } from "./period";
import { isExcludedRep } from "./reps";
import { contractCategory } from "./aggregate";
import { yen, num, pct } from "./format";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 日付文字列(YYYY-MM-DD)に n 日加算 */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** その日(YYYY-MM-DD)を含む週の月曜日 */
export function mondayOfYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=日
  const diff = dow === 0 ? 6 : dow - 1;
  return addDays(ymd, -diff);
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];
/** "6/23(月)" 形式 */
export function ymdLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${WD[dow]})`;
}

export type RepCount = { rep: string; count: number };
export type PeriodStats = {
  activity: number; // 活動（IS担当ありの最終更新日が期間内）
  appts: number; // アポ獲得（アポ取得日が期間内）
  newSns: number; // 新規契約 採用SNS
  newAgency: number; // 新規契約 人材紹介
  byRep: RepCount[]; // 担当別 活動（多い順）
};

/** [start, end]（両端含む・YYYY-MM-DD, JST基準）で集計 */
export function statsForRange(customers: ListCustomer[], contracts: Contract[], start: string, end: string): PeriodStats {
  let activity = 0;
  let appts = 0;
  let newSns = 0;
  let newAgency = 0;
  const byRep = new Map<string, number>();
  for (const c of customers) {
    if (c.isRep && !isExcludedRep(c.isRep) && c.lastEdited) {
      const k = jstDateKey(c.lastEdited);
      if (k && k >= start && k <= end) {
        activity++;
        byRep.set(c.isRep, (byRep.get(c.isRep) ?? 0) + 1);
      }
    }
    if (!isExcludedRep(c.isRep) && c.appointmentDate) {
      const k = c.appointmentDate.slice(0, 10);
      if (k >= start && k <= end) appts++;
    }
  }
  for (const ct of contracts) {
    if (!ct.start) continue;
    const k = ct.start.slice(0, 10);
    if (k < start || k > end) continue;
    const cat = contractCategory(ct.kinds);
    if (cat === "採用SNS") newSns++;
    else if (cat === "人材紹介") newAgency++;
  }
  return {
    activity,
    appts,
    newSns,
    newAgency,
    byRep: [...byRep.entries()].map(([rep, count]) => ({ rep, count })).sort((a, b) => b.count - a.count),
  };
}

/** 当週/先週/本日の日付範囲（JST） */
export function ranges(now = new Date()) {
  const today = jstDateKey(now) ?? "";
  const thisMon = mondayOfYmd(today);
  const lastMon = addDays(thisMon, -7);
  const lastSun = addDays(thisMon, -1);
  return { today, thisMon, lastMon, lastSun };
}

function repLine(byRep: RepCount[], n = 8): string {
  if (byRep.length === 0) return "（活動なし）";
  return byRep.slice(0, n).map((r) => `${r.rep} ${r.count}`).join(" / ");
}

function goalStr(actual: number, target: number, achievement: number | null): string {
  const t = target > 0 ? num(target) : "—";
  const a = achievement != null ? `（${pct(achievement)}）` : "";
  return `${num(actual)}/${t}${a}`;
}

function monthHeader(): { label: string; range: string } {
  const k = currentMonthKey();
  return { label: monthLabel(k), range: monthRangeLabel(k) };
}

/** 月次進捗の共通行（アポ・契約・MRR） */
function monthProgressLines(dash: DashboardData): string[] {
  const g = dash.goals;
  const mh = monthHeader();
  return [
    `― 今月（${mh.label} ${mh.range}）進捗 ―`,
    `アポ ${goalStr(g.monthlyAppointments.actual, g.monthlyAppointments.target, g.monthlyAppointments.achievement)}`,
    `契約 採用SNS ${goalStr(g.monthlyContractsSns.actual, g.monthlyContractsSns.target, g.monthlyContractsSns.achievement)} ・ 人材紹介 ${goalStr(g.monthlyContractsAgency.actual, g.monthlyContractsAgency.target, g.monthlyContractsAgency.achievement)}`,
    `MRR ${yen(dash.kpi.mrr)} ・ 稼働契約 ${num(dash.kpi.activeContracts)}件`,
  ];
}

/** 日次（平日夕方）Slack本文 */
export function dailySlackText(today: PeriodStats, dash: DashboardData, todayYmd: string): string {
  return [
    `📊 *LET 日次レポート* ${ymdLabel(todayYmd)}`,
    `活動 *${num(today.activity)}件* ・ アポ獲得 *${num(today.appts)}件* ・ 新規契約 採用SNS ${num(today.newSns)} / 人材紹介 ${num(today.newAgency)}`,
    `担当別 活動: ${repLine(today.byRep)}`,
    ...monthProgressLines(dash),
  ].join("\n");
}

/** 週次（月曜朝）Slack本文 */
export function weeklySlackText(
  lastWeek: PeriodStats,
  thisWeek: PeriodStats,
  dash: DashboardData,
  r: { lastMon: string; lastSun: string; thisMon: string; today: string },
): string {
  return [
    `🗓 *LET 週次レポート*（月曜朝）`,
    `■ 先週 ${ymdLabel(r.lastMon)}〜${ymdLabel(r.lastSun)}`,
    `　活動 *${num(lastWeek.activity)}* ・ アポ *${num(lastWeek.appts)}* ・ 新規契約 採用SNS ${num(lastWeek.newSns)} / 人材紹介 ${num(lastWeek.newAgency)}`,
    `　担当別 活動: ${repLine(lastWeek.byRep)}`,
    `■ 今週 ${ymdLabel(r.thisMon)}〜${ymdLabel(r.today)}（途中）`,
    `　活動 ${num(thisWeek.activity)} ・ アポ ${num(thisWeek.appts)} ・ 新規契約 採用SNS ${num(thisWeek.newSns)} / 人材紹介 ${num(thisWeek.newAgency)}`,
    ...monthProgressLines(dash),
  ].join("\n");
}
