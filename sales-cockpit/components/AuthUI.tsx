"use client";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-7 w-full max-w-sm animate-growFromBottom">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand animate-pulseDot" />
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-night-1 ring-1 ring-white/10 text-sm focus:outline-none focus:ring-brand-glow/50"
      />
    </label>
  );
}
