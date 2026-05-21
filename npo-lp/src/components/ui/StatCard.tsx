type StatCardProps = {
  value: string;
  unit: string;
  label: string;
};

export default function StatCard({ value, unit, label }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl font-bold text-accent-orange">{value}</span>
        <span className="text-lg font-medium text-text-secondary">{unit}</span>
      </div>
      <p className="mt-2 text-sm text-text-secondary">{label}</p>
    </div>
  );
}
