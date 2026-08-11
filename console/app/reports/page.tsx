import Link from "next/link";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { getReports } from "@/lib/data";

export default function ReportsIndex() {
  const reports = getReports();
  const byMonth: Record<string, typeof reports> = {};
  reports.forEach((r) => { (byMonth[r.id.slice(0, 7)] ??= []).push(r); });
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-[var(--fg-muted)]" />
          <span className="h-section">日次レポート</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">アーカイブ</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">{reports.length} 件 — <code className="text-xs">daily_reports/</code></p>
      </header>
      {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, list], i) => (
        <section key={month} className="animate-growFromBottom" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold">{month}</h2>
            <span className="text-xs text-[var(--fg-muted)]">{list.length}</span>
            <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded hover:bg-[var(--hover)] transition text-sm">
                  <span className="font-medium">{r.id}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
