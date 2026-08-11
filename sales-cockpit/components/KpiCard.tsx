import clsx from "clsx";

export function KpiCard({
  label,
  value,
  sub,
  accent = "brand",
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "indigo" | "amber" | "pink" | "teal";
  onClick?: () => void;
}) {
  const accentText = {
    brand: "text-brand",
    indigo: "text-accent-indigo",
    amber: "text-accent-amber",
    pink: "text-accent-pink",
    teal: "text-accent-teal",
  }[accent];

  return (
    <div
      onClick={onClick}
      className={clsx(
        "card p-4 animate-growFromBottom",
        onClick && "cursor-pointer hover:ring-white/20 transition-shadow hover:shadow-lift",
      )}
    >
      <div className="text-xs font-medium text-ink-muted flex items-center justify-between">
        {label}
        {onClick && <span className="text-[10px] text-ink-muted/70">内訳 ›</span>}
      </div>
      <div className={clsx("mt-1 text-2xl font-bold tabular-nums", accentText)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
