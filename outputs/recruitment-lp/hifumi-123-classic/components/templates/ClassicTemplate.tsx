import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function ClassicTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-cream-50 text-stone-900">
      {/* Header */}
      <header className="border-b-2 border-navy-900 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="text-[10px] tracking-widest text-stone-500 sm:text-xs">RECRUITING SITE</div>
            <div className="truncate text-sm font-bold tracking-wide text-navy-900 sm:text-lg">{company.name}</div>
          </div>
          <div className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#message" className="text-stone-700 hover:text-navy-900">代表メッセージ</a>
            <a href="#company" className="text-stone-700 hover:text-navy-900">会社情報</a>
            <a href="#business" className="text-stone-700 hover:text-navy-900">事業内容</a>
            <a href="#jobs" className="text-stone-700 hover:text-navy-900">募集要項</a>
            <a href="#apply" className="text-stone-700 hover:text-navy-900">エントリー</a>
          </div>
          <a
            href="#apply"
            className="shrink-0 bg-brass-500 px-4 py-2 text-xs font-bold tracking-wider text-navy-950 hover:bg-brass-400 md:hidden"
          >
            ENTRY
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" />
        {/* 建築図面風の細いライン */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-24 text-white sm:px-6 sm:py-32 md:py-48">
          <div className="mb-6 inline-block border-y border-brass-500 px-3 py-1 text-[10px] font-medium tracking-[0.4em] text-brass-400 sm:px-4 sm:text-xs">
            RECRUIT&nbsp;&nbsp;2026
          </div>
          <h1 className="font-serif text-4xl font-bold leading-[1.2] sm:text-5xl md:text-7xl">
            {company.tagline ?? "未来を、共に築く人へ。"}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100 sm:mt-8 sm:text-lg md:text-xl">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 md:mt-12">
            <a
              href="#apply"
              className="bg-brass-500 px-8 py-3.5 text-center text-sm font-bold tracking-wider text-navy-950 hover:bg-brass-400 sm:px-10 sm:py-4"
            >
              ENTRY ＞
            </a>
            <a
              href="#jobs"
              className="border-2 border-white px-8 py-3.5 text-center text-sm font-bold tracking-wider text-white hover:bg-white hover:text-navy-900 sm:px-10 sm:py-4"
            >
              募集要項を見る
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:gap-8 sm:px-6 sm:py-12 md:grid-cols-4">
          {[
            { label: "創業", value: company.founded ?? "—" },
            { label: "事業領域", value: `${services.length}事業` },
            { label: "募集職種", value: `${jobs.length}職種` },
            { label: "本社所在地", value: company.address?.split("（")[0].slice(0, 10) ?? "—" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[10px] tracking-widest text-stone-500 sm:text-xs">{s.label}</div>
              <div className="mt-2 break-keep font-serif text-lg font-bold text-navy-900 sm:text-2xl md:text-3xl">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Message */}
      <section id="message" className="px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center md:mb-12">
            <p className="text-[10px] tracking-[0.4em] text-brass-600 sm:text-xs">MESSAGE</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-navy-900 sm:text-3xl md:text-4xl">代表メッセージ</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brass-500" />
          </div>
          <div className="rounded-sm border-l-4 border-brass-500 bg-white p-6 shadow-sm sm:p-10">
            <p className="font-serif text-base leading-loose text-stone-700 sm:text-lg md:text-xl">
              {company.mission ?? company.description ?? ""}
            </p>
            {company.ceo && (
              <p className="mt-6 text-right text-xs text-stone-600 sm:mt-8 sm:text-sm">
                代表取締役<span className="ml-3 font-serif text-base font-bold text-navy-900 sm:ml-4 sm:text-lg">{company.ceo}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Company */}
      <section id="company" className="bg-cream-100 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center md:mb-12">
            <p className="text-[10px] tracking-[0.4em] text-brass-600 sm:text-xs">COMPANY</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-navy-900 sm:text-3xl md:text-4xl">会社情報</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brass-500" />
          </div>
          {/* SP: definition list / PC: table */}
          <dl className="block bg-white text-sm md:hidden">
            {[
              { label: "会社名", value: `${company.name}${company.name_en ? `（${company.name_en}）` : ""}` },
              ...(company.founded ? [{ label: "設立", value: company.founded }] : []),
              ...(company.ceo ? [{ label: "代表者", value: company.ceo }] : []),
              ...(company.address ? [{ label: "所在地", value: company.address }] : []),
              ...(company.description ? [{ label: "事業内容", value: company.description }] : []),
            ].map((row) => (
              <div key={row.label} className="border-b border-stone-200 px-4 py-4 last:border-b-0">
                <dt className="text-xs font-medium text-brass-600">{row.label}</dt>
                <dd className="mt-1.5 text-stone-800">{row.value}</dd>
              </div>
            ))}
          </dl>
          <table className="hidden w-full border-collapse bg-white text-base md:table">
            <tbody>
              <tr className="border-b border-stone-200">
                <th className="w-1/3 bg-cream-50 px-6 py-5 text-left font-medium text-stone-600">会社名</th>
                <td className="px-6 py-5">{company.name}{company.name_en ? `（${company.name_en}）` : ""}</td>
              </tr>
              {company.founded && (
                <tr className="border-b border-stone-200">
                  <th className="bg-cream-50 px-6 py-5 text-left font-medium text-stone-600">設立</th>
                  <td className="px-6 py-5">{company.founded}</td>
                </tr>
              )}
              {company.ceo && (
                <tr className="border-b border-stone-200">
                  <th className="bg-cream-50 px-6 py-5 text-left font-medium text-stone-600">代表者</th>
                  <td className="px-6 py-5">{company.ceo}</td>
                </tr>
              )}
              {company.address && (
                <tr className="border-b border-stone-200">
                  <th className="bg-cream-50 px-6 py-5 text-left font-medium text-stone-600">所在地</th>
                  <td className="px-6 py-5">{company.address}</td>
                </tr>
              )}
              {company.description && (
                <tr>
                  <th className="bg-cream-50 px-6 py-5 text-left font-medium text-stone-600">事業内容</th>
                  <td className="px-6 py-5">{company.description}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Business */}
      <section id="business" className="px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center md:mb-16">
            <p className="text-[10px] tracking-[0.4em] text-brass-600 sm:text-xs">BUSINESS</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-navy-900 sm:text-3xl md:text-4xl">事業内容</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brass-500" />
          </div>
          <div className="space-y-10 sm:space-y-12">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`grid gap-6 md:grid-cols-2 md:items-center md:gap-8 ${i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-sm bg-gradient-to-br from-navy-900 to-navy-800 text-white">
                  <div className="text-center">
                    <div className="font-serif text-5xl font-bold text-brass-400 opacity-50 sm:text-6xl">{String(i + 1).padStart(2, "0")}</div>
                    <div className="mt-2 text-[10px] tracking-widest text-brass-400 sm:text-xs">BUSINESS</div>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-[10px] tracking-widest text-brass-600 sm:text-xs">事業 {String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mb-3 font-serif text-xl font-bold text-navy-900 sm:mb-4 sm:text-2xl md:text-3xl">{service.name}</h3>
                  <p className="text-sm leading-relaxed text-stone-700 sm:text-base">{service.description}</p>
                  {service.target && (
                    <p className="mt-4 inline-block border border-stone-300 bg-cream-50 px-3 py-1 text-xs">
                      対象: {service.target}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section id="jobs" className="bg-cream-100 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center md:mb-16">
            <p className="text-[10px] tracking-[0.4em] text-brass-600 sm:text-xs">RECRUIT</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-navy-900 sm:text-3xl md:text-4xl">募集要項</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brass-500" />
          </div>
          <div className="space-y-5 sm:space-y-6">
            {jobs.map((job) => (
              <details
                key={job.title}
                className="group border border-stone-300 bg-white"
                open
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 p-4 hover:bg-cream-50 sm:items-center sm:p-6">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg font-bold text-navy-900 sm:text-xl md:text-2xl">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
                      <span>● {job.employment_type}</span>
                      <span>● {job.location}</span>
                      {job.salary && <span>● {job.salary}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-brass-600 transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-stone-200 p-4 sm:p-6">
                  <p className="text-sm leading-relaxed text-stone-700 sm:text-base">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-5 sm:mt-6">
                      <h4 className="mb-3 text-xs font-bold tracking-wider text-brass-600 sm:text-sm">必須要件</h4>
                      <ul className="space-y-2 text-sm text-stone-700">
                        {job.requirements.map((req) => (
                          <li key={req} className="flex gap-3 border-b border-stone-100 pb-2">
                            <span className="text-brass-600">◆</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center md:mb-12">
            <p className="text-[10px] tracking-[0.4em] text-brass-600 sm:text-xs">ENTRY</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-navy-900 sm:text-3xl md:text-4xl">エントリーフォーム</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brass-500" />
          </div>
          <div className="border-t-2 border-brass-500 bg-white p-6 shadow-sm sm:p-10">
            <ApplicationForm
              variant="classic"
              accentClassName="focus:ring-navy-800 focus:border-navy-800"
              buttonClassName="bg-navy-900 text-white hover:bg-navy-800"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-brass-500 bg-navy-950 px-6 py-12 text-cream-100">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-serif text-lg font-bold text-white">{company.name}</p>
          {company.address && <p className="mt-2 text-xs opacity-75">{company.address}</p>}
          <p className="mt-6 text-xs opacity-60">© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
