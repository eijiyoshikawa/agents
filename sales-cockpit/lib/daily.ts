// 日次ボードの集計（純粋関数。2026-11-09 代表依頼「営業が毎日何ができていないかが分かる」「各日ごとに各ステータスが何件あるか」）。
//
// 定義（すべて JST の日付・発生日で数える）:
//   架電・接触・アポ … 📞 架電記録（コックピットの「架電結果を記録」で日付つきで残る）。結果ごとの件数もここから
//   商談実施・リスケ・キャンセル・先方不在 … 📅 アポ管理の結果（結果記録日）
//   新規契約 … 🤝 契約管理DB の契約開始日（S担当）
//   架電目標 … 担当者の日別目標 × 期間の営業日数（今日までの分）
import type { CallEvent, Contract, Customer } from "./types";
import type { Appointment } from "./notion";
import { isExcludedRep } from "./reps";

export type Period = "day" | "week" | "month";

/** 架電記録の結果の並び（表の列順） */
export const CALL_RESULTS = ["アポイント獲得", "見込み客", "資料請求", "通話", "再コール", "担当者不在", "不在", "不通", "受付拒否", "担当者拒否", "クレーム"] as const;
export const APPT_RESULTS = ["実施", "リスケ", "キャンセル", "先方不在"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function dow(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export const isBusinessDay = (ymd: string) => dow(ymd) !== 0 && dow(ymd) !== 6;
/** ISO 日時 → JST の YYYY-MM-DD（日付だけならそのまま） */
export function jstYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return new Date(t.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function periodRange(period: Period, today: string): { from: string; to: string; label: string } {
  if (period === "day") return { from: today, to: today, label: "今日" };
  if (period === "week") {
    const w = dow(today);
    return { from: addDays(today, -(w === 0 ? 6 : w - 1)), to: today, label: "今週" };
  }
  return { from: `${today.slice(0, 7)}-01`, to: today, label: "今月" };
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export type Targets = { dailyCallsDefault: number; dailyCallsByRep: Record<string, number>; workingDaysPerMonth: number; monthlyAppointments: number; monthlyContractsSns: number; monthlyContractsAgency: number };

export function dailyCallTarget(t: Targets | null, rep: string): number {
  if (!t) return 0;
  const v = t.dailyCallsByRep?.[rep];
  return typeof v === "number" && v > 0 ? v : t.dailyCallsDefault || 0;
}

export type RepRow = {
  rep: string;
  calls: number;
  callTarget: number; // 期間の営業日 × 日別目標（今日までの分）。0 = 未設定
  connected: number;
  appts: number;
  meetings: number; // 商談実施
  reschedules: number;
  cancels: number;
  noShows: number;
  newContracts: number;
};

export type DayRow = { date: string; business: boolean; counts: Record<string, number>; calls: number };

export type Todo = { kind: "calls" | "followup" | "schedule" | "outcome" | "unlogged" | "product" | "zeroDay"; text: string; items?: { id: string; name: string; href: string; note?: string; appointmentId?: string }[] };

export type DailyBoard = {
  today: string;
  period: Period;
  range: { from: string; to: string; label: string };
  reps: RepRow[];
  total: RepRow;
  days: DayRow[]; // 期間の日別×結果（今日のときは直近14日）
  todos: { rep: string; items: Todo[] }[];
  pendingOutcomes: Appointment[]; // 予定日を過ぎて結果が未回答
  missingSchedule: Appointment[]; // 実施予定日時が未入力
  unlogged: { id: string; name: string; rep: string | null; obtainedOn: string }[]; // アポ獲得したのにアポ管理に無い
};

const inRange = (d: string | null, from: string, to: string) => !!d && d >= from && d <= to;
const repOf = (r: string | null | undefined) => (r && r.trim() ? r : "未割当");

export function buildDailyBoard(input: {
  period: Period;
  today: string;
  now?: Date;
  calls: CallEvent[];
  appointments: Appointment[];
  followups: Customer[];
  appointedCustomers: { id: string; name: string; status: string | null; isRep: string | null; appointmentDate: string | null }[];
  contracts: Contract[];
  targets: Targets | null;
  baseReps: string[];
}): DailyBoard {
  const { period, today, targets } = input;
  const now = input.now ?? new Date();
  const range = periodRange(period, today);
  const calls = input.calls.filter((c) => c.source === "架電記録" && !isExcludedRep(c.rep));
  const appts = input.appointments.filter((a) => !isExcludedRep(a.rep));

  // ---- 担当者別（期間）
  const repNames = new Set<string>(input.baseReps);
  const monthFrom = `${today.slice(0, 7)}-01`;
  for (const c of calls) if (inRange(jstYmd(c.date), monthFrom, today)) repNames.add(repOf(c.rep));
  for (const a of appts) if (inRange(a.resultOn, monthFrom, today) || a.result === "予定") repNames.add(repOf(a.rep));
  const businessDays = daysBetween(range.from, range.to).filter(isBusinessDay).length;
  const blank = (rep: string): RepRow => ({ rep, calls: 0, callTarget: dailyCallTarget(targets, rep) * businessDays, connected: 0, appts: 0, meetings: 0, reschedules: 0, cancels: 0, noShows: 0, newContracts: 0 });
  const rows = new Map<string, RepRow>([...repNames].map((r) => [r, blank(r)]));
  const row = (rep: string) => rows.get(rep) ?? rows.set(rep, blank(rep)).get(rep)!;
  for (const c of calls) {
    if (!inRange(jstYmd(c.date), range.from, range.to)) continue;
    const r = row(repOf(c.rep));
    r.calls++;
    if (c.isConnected) r.connected++;
    if (c.isAppointment) r.appts++;
  }
  for (const a of appts) {
    if (!inRange(a.resultOn, range.from, range.to)) continue;
    const r = row(repOf(a.rep));
    if (a.result === "実施") r.meetings++;
    else if (a.result === "リスケ") r.reschedules++;
    else if (a.result === "キャンセル") r.cancels++;
    else if (a.result === "先方不在") r.noShows++;
  }
  for (const k of input.contracts) {
    if (!inRange(k.start, range.from, range.to)) continue;
    if (isExcludedRep(k.sRep)) continue;
    row(repOf(k.sRep)).newContracts++;
  }
  const reps = [...rows.values()].filter((r) => r.calls || r.callTarget || r.appts || r.meetings || r.newContracts || input.baseReps.includes(r.rep)).sort((a, b) => b.calls - a.calls);
  const total = reps.reduce<RepRow>(
    (t, r) => ({ ...t, calls: t.calls + r.calls, callTarget: t.callTarget + r.callTarget, connected: t.connected + r.connected, appts: t.appts + r.appts, meetings: t.meetings + r.meetings, reschedules: t.reschedules + r.reschedules, cancels: t.cancels + r.cancels, noShows: t.noShows + r.noShows, newContracts: t.newContracts + r.newContracts }),
    { ...blank("合計"), callTarget: 0 },
  );

  // ---- 日別 × 結果
  const dayFrom = period === "day" ? addDays(today, -13) : range.from;
  const days: DayRow[] = daysBetween(dayFrom, today).map((date) => ({ date, business: isBusinessDay(date), counts: {}, calls: 0 }));
  const dayIdx = new Map(days.map((d, i) => [d.date, i]));
  for (const c of calls) {
    const i = dayIdx.get(jstYmd(c.date) ?? "");
    if (i === undefined) continue;
    const key = c.result && (CALL_RESULTS as readonly string[]).includes(c.result) ? c.result : "その他";
    days[i].counts[key] = (days[i].counts[key] ?? 0) + 1;
    days[i].calls++;
  }
  for (const a of appts) {
    const i = dayIdx.get(a.resultOn ?? "");
    if (i === undefined || !a.result || a.result === "予定") continue;
    const key = `アポ${a.result}`;
    days[i].counts[key] = (days[i].counts[key] ?? 0) + 1;
  }

  // ---- アポの対応
  const nowIso = now.toISOString();
  const pending = appts.filter((a) => a.result === "予定");
  const pendingOutcomes = pending.filter((a) => a.scheduledAt && new Date(a.scheduledAt.length === 10 ? `${a.scheduledAt}T23:59:59+09:00` : a.scheduledAt).toISOString() < nowIso).sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  const missingSchedule = pending.filter((a) => !a.scheduledAt);
  const logged = new Set(appts.map((a) => a.customerId).filter(Boolean));
  const since = addDays(today, -60);
  const unlogged = input.appointedCustomers
    .filter((c) => c.status === "アポイント獲得" && c.appointmentDate && c.appointmentDate.slice(0, 10) >= since && !logged.has(c.id) && !isExcludedRep(c.isRep))
    .map((c) => ({ id: c.id, name: c.name, rep: c.isRep, obtainedOn: c.appointmentDate!.slice(0, 10) }));

  // ---- 今日できていないこと（担当者別）
  const calledToday = new Set(calls.filter((c) => jstYmd(c.date) === today).map((c) => c.customerId).filter(Boolean));
  const weekRange = periodRange("week", today);
  const todos = reps
    .filter((r) => r.rep !== "未割当")
    .map((r) => {
      const items: Todo[] = [];
      const todayCalls = calls.filter((c) => repOf(c.rep) === r.rep && jstYmd(c.date) === today);
      const target = dailyCallTarget(targets, r.rep);
      if (isBusinessDay(today)) {
        if (target > 0 && todayCalls.length < target) items.push({ kind: "calls", text: `架電 ${todayCalls.length}件 / 目標 ${target}件（あと ${target - todayCalls.length}件）` });
        else if (target === 0 && todayCalls.length === 0) items.push({ kind: "calls", text: "今日の架電記録がまだ 0件です（架電目標は未設定）" });
      }
      const follow = input.followups
        .filter((c) => repOf(c.isRep) === r.rep && c.nextFollow && c.nextFollow.slice(0, 10) <= today && !calledToday.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, href: `/customer/${c.id}`, note: `フォロー日 ${c.nextFollow!.slice(5, 10).replace("-", "/")}` }));
      if (follow.length) items.push({ kind: "followup", text: `期限が来たフォロー・再コールが未対応 ${follow.length}件`, items: follow.slice(0, 20) });
      const sched = missingSchedule.filter((a) => repOf(a.rep) === r.rep);
      if (sched.length) items.push({ kind: "schedule", text: `アポの実施予定日時が未入力 ${sched.length}件`, items: sched.map((a) => ({ id: a.customerId ?? a.id, name: a.customerName, href: a.customerId ? `/customer/${a.customerId}` : a.url, appointmentId: a.id })) });
      const outcome = pendingOutcomes.filter((a) => repOf(a.rep) === r.rep);
      if (outcome.length) items.push({ kind: "outcome", text: `予定日を過ぎたアポの結果が未回答 ${outcome.length}件`, items: outcome.map((a) => ({ id: a.customerId ?? a.id, name: a.customerName, href: a.customerId ? `/customer/${a.customerId}` : a.url, note: `予定 ${a.scheduledAt!.slice(5, 16).replace("T", " ").replace("-", "/")}`, appointmentId: a.id })) });
      const un = unlogged.filter((c) => repOf(c.rep) === r.rep);
      if (un.length) items.push({ kind: "unlogged", text: `アポ獲得したのにアポ管理に未登録 ${un.length}件（実施予定日時を入れてください）`, items: un.map((c) => ({ id: c.id, name: c.name, href: `/customer/${c.id}`, note: `取得 ${c.obtainedOn.slice(5).replace("-", "/")}` })) });
      const noProduct = todayCalls.filter((c) => !c.product).length;
      if (noProduct) items.push({ kind: "product", text: `今日の架電のうち入口商材が未入力 ${noProduct}件` });
      const zero = daysBetween(weekRange.from, addDays(today, -1)).filter((d) => isBusinessDay(d) && !calls.some((c) => repOf(c.rep) === r.rep && jstYmd(c.date) === d));
      if (zero.length && (target > 0 || calls.some((c) => repOf(c.rep) === r.rep))) items.push({ kind: "zeroDay", text: `今週、架電記録が 0件の日: ${zero.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`).join("・")}` });
      return { rep: r.rep, items };
    });

  return { today, period, range, reps, total, days, todos, pendingOutcomes, missingSchedule, unlogged };
}
