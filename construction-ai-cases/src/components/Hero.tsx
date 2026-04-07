import { HardHat, Zap, TrendingUp } from "lucide-react";

const stats = [
  { icon: HardHat, value: "20", label: "業務活用事例" },
  { icon: Zap, value: "5", label: "カテゴリ" },
  { icon: TrendingUp, value: "40〜80%", label: "業務時間削減" },
];

export default function Hero() {
  return (
    <section className="bg-primary text-white">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
          Construction x AI
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          建設業 x AI
          <br />
          <span className="text-accent">業務効率化</span>の全体像
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
          施工管理・安全管理・設計積算・営業事務・人材教育 —
          建設業界の主要業務をAIでどう変えられるか、20の具体的事例で解説します。
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-white/10 px-6 py-8 backdrop-blur"
            >
              <s.icon className="mx-auto mb-3 h-8 w-8 text-accent" />
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-sm text-white/70">{s.label}</p>
            </div>
          ))}
        </div>

        <a
          href="#cases"
          className="mt-10 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-white transition hover:bg-accent-light"
        >
          事例を見る
        </a>
      </div>
    </section>
  );
}
