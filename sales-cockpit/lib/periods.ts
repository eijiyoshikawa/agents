// ホーム上部の「今日・今週・今月」（2026-11-09 代表依頼「全体の数字より週間・月間で」）。純粋関数。
import { buildDailyBoard, daysBetween, isBusinessDay, periodRange, type Period, type Targets } from "./daily";
import { contractCategory } from "./aggregate";
import type { CallEvent, Contract } from "./types";
import type { Appointment } from "./notion";

export type PeriodCell = { actual: number; target: number | null };
export type PeriodSummary = {
  period: Period;
  label: string;
  range: string;
  calls: PeriodCell;
  connected: PeriodCell;
  appts: PeriodCell;
  meetings: PeriodCell;
  contractsSns: PeriodCell;
  contractsAgency: PeriodCell;
};

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

export function buildPeriodSummaries(input: { today: string; calls: CallEvent[]; appointments: Appointment[]; contracts: Contract[]; targets: Targets | null }): PeriodSummary[] {
  const { today, targets } = input;
  const workDays = targets?.workingDaysPerMonth || 20;
  return (["day", "week", "month"] as Period[]).map((period) => {
    const b = buildDailyBoard({ period, today, calls: input.calls, appointments: input.appointments, followups: [], appointedCustomers: [], contracts: input.contracts, targets, baseReps: [] });
    const r = periodRange(period, today);
    const bdays = daysBetween(r.from, r.to).filter(isBusinessDay).length;
    // 月の目標は営業日で按分（今日までの分）。今日・今週も同じ考え方
    const share = Math.min(1, bdays / workDays);
    const scaled = (monthly: number | undefined) => (monthly && monthly > 0 ? Math.round(monthly * share * 10) / 10 : null);
    const newIn = (cat: string) => input.contracts.filter((c) => c.start && c.start >= r.from && c.start <= r.to && contractCategory(c.kinds) === cat).length;
    return {
      period,
      label: r.label,
      range: r.from === r.to ? md(r.from) : `${md(r.from)}〜${md(r.to)}`,
      calls: { actual: b.total.calls, target: b.total.callTarget > 0 ? b.total.callTarget : null },
      connected: { actual: b.total.connected, target: null },
      appts: { actual: b.total.appts, target: scaled(targets?.monthlyAppointments) },
      meetings: { actual: b.total.meetings, target: null },
      contractsSns: { actual: newIn("採用SNS"), target: scaled(targets?.monthlyContractsSns) },
      contractsAgency: { actual: newIn("人材紹介"), target: scaled(targets?.monthlyContractsAgency) },
    };
  });
}
