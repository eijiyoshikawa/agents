import Link from "next/link";
import { getReports } from "@/lib/data";

export default function ReportsIndex() {
  const reports = getReports();
  const byMonth: Record<string, typeof reports> = {};
  reports.forEach((r) => {
    const m = r.id.slice(0, 7);
    (byMonth[m] ??= []).push(r);
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">日次レポート</h1>
        <p className="text-ink-soft mt-1">{reports.length} 件 — `daily_reports/`</p>
      </header>
      {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, list]) => (
        <section key={month}>
          <h2 className="h-section mb-3">{month}</h2>
          <ul className="divide-y divide-ink/5">
            {list.map((r) => (
              <li key={r.id} className="py-2">
                <Link href={`/reports/${r.id}`} className="text-sm hover:underline">{r.id}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
