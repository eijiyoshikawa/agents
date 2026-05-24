import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function ModernTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold tracking-wide">
            {company.name_en ?? company.name}
          </div>
          <div className="hidden gap-8 text-sm md:flex">
            <a href="#about" className="text-slate-600 hover:text-slate-900">About</a>
            <a href="#services" className="text-slate-600 hover:text-slate-900">Services</a>
            <a href="#jobs" className="text-slate-600 hover:text-slate-900">Jobs</a>
            <a href="#apply" className="text-slate-600 hover:text-slate-900">Apply</a>
          </div>
          <a
            href="#apply"
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            ENTRY
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative px-6 pb-24 pt-40 md:pt-48">
        <div className="mx-auto max-w-6xl">
          <p className="mb-6 text-xs font-medium tracking-[0.3em] text-emerald-600">
            RECRUITING 2026
          </p>
          <h1 className="mb-8 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            {company.tagline ?? "新しい挑戦が、ここから始まる。"}
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 md:text-xl">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <a
              href="#jobs"
              className="rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              募集職種を見る
            </a>
            <a
              href="#about"
              className="rounded-full border border-slate-300 px-8 py-4 text-sm font-semibold text-slate-700 hover:border-slate-900"
            >
              会社について
            </a>
          </div>
        </div>
        <div className="pointer-events-none absolute right-0 top-1/3 hidden h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl md:block" />
      </section>

      {/* About */}
      <section id="about" className="border-t border-slate-100 px-6 py-24">
        <div className="mx-auto max-w-6xl grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.3em] text-emerald-600">ABOUT</p>
            <h2 className="text-3xl font-bold md:text-4xl">私たちについて</h2>
          </div>
          <div className="space-y-6 text-slate-600">
            <p className="text-lg leading-relaxed">{company.description}</p>
            <dl className="grid gap-6 border-t border-slate-100 pt-6 md:grid-cols-2">
              {company.founded && (
                <div>
                  <dt className="text-xs font-medium tracking-wider text-slate-400">FOUNDED</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">{company.founded}</dd>
                </div>
              )}
              {company.ceo && (
                <div>
                  <dt className="text-xs font-medium tracking-wider text-slate-400">CEO</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">{company.ceo}</dd>
                </div>
              )}
              {company.address && (
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium tracking-wider text-slate-400">ADDRESS</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">{company.address}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-slate-100 bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-medium tracking-[0.3em] text-emerald-600">SERVICES</p>
          <h2 className="mb-16 text-3xl font-bold md:text-4xl">事業内容</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, i) => (
              <div
                key={service.name}
                className="rounded-2xl border border-slate-200 bg-white p-8 transition hover:border-slate-900"
              >
                <div className="mb-6 text-4xl font-bold text-slate-200">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mb-3 text-xl font-bold">{service.name}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{service.description}</p>
                {service.target && (
                  <p className="mt-4 text-xs text-slate-400">対象: {service.target}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section id="jobs" className="border-t border-slate-100 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-medium tracking-[0.3em] text-emerald-600">JOBS</p>
          <h2 className="mb-16 text-3xl font-bold md:text-4xl">募集職種</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {jobs.map((job) => (
              <div key={job.title} className="grid gap-6 py-10 md:grid-cols-[1fr_2fr]">
                <div>
                  <h3 className="text-2xl font-bold">{job.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{job.employment_type}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{job.location}</span>
                  </div>
                  {job.salary && (
                    <p className="mt-3 text-sm font-medium text-emerald-700">{job.salary}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-600">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium tracking-wider text-slate-400">REQUIREMENTS</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {job.requirements.map((req) => (
                          <li key={req} className="flex gap-2">
                            <span className="text-emerald-600">—</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="border-t border-slate-100 bg-slate-900 px-6 py-24 text-white">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.3em] text-emerald-400">APPLY</p>
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">エントリー</h2>
            <p className="text-slate-300">
              ご興味をお持ちいただきありがとうございます。<br />
              必要事項をご記入のうえ、送信してください。
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 text-slate-900">
            <ApplicationForm
              variant="modern"
              accentClassName="focus:ring-emerald-500 focus:border-emerald-500"
              buttonClassName="bg-emerald-600 text-white hover:bg-emerald-700"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-950 px-6 py-12 text-slate-400">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-white">{company.name}</p>
          <p className="mt-2 text-xs">© {new Date().getFullYear()} {company.name_en ?? company.name}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
