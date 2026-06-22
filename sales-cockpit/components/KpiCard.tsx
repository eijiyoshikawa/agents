import clsx from "clsx";

export function KpiCard({
  label,
  value,
  sub,
  accent = "brand",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "indigo" | "amber" | "pink" | "teal";
}) {
  const accentText = {
    brand: "text-brand",
    indigo: "text-accent-indigo",
    amber: "text-accent-amber",
    pink: "text-accent-pink",
    teal: "text-accent-teal",
  }[accent];

  return (
    <div className="card p-4 animate-growFromBottom">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className={clsx("mt-1 text-2xl font-bold tabular-nums", accentText)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
