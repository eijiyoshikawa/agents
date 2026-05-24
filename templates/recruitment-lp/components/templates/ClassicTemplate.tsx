import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function ClassicTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      {/* Header */}
      <header className="border-b-2 border-stone-900 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs tracking-widest text-stone-500">RECRUITING SITE</div>
            <div className="text-lg font-bold tracking-wide">{company.name}</div>
          </div>
          <div className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#message" className="text-stone-700 hover:text-stone-900">代表メッセージ</a>
            <a href="#company" className="text-stone-700 hover:text-stone-900">会社情報</a>
            <a href="#business" className="text-stone-700 hover:text-stone-900">事業内容</a>
            <a href="#jobs" className="text-stone-700 hover:text-stone-900">募集要項</a>
            <a href="#apply" className="text-stone-700 hover:text-stone-900">エントリー</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <div className="relative mx-auto max-w-6xl px-6 py-32 text-white md:py-48">
          <div className="mb-6 inline-block border-y border-amber-300 px-4 py-1 text-xs font-medium tracking-[0.4em] text-amber-300">
            RECRUIT&nbsp;&nbsp;2026
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight md:text-7xl">
            {company.tagline ?? "未来を、共に創る人へ。"}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-blue-100 md:text-xl">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <a
              href="#apply"
              className="bg-amber-400 px-10 py-4 text-sm font-bold tracking-wider text-stone-900 hover:bg-amber-300"
            >
              ENTRY ＞
            </a>
            <a
              href="#jobs"
              className="border-2 border-white px-10 py-4 text-sm font-bold tracking-wider text-white hover:bg-white hover:text-blue-900"
            >
              募集要項を見る
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {[
            { label: "創業", value: company.founded ?? "—" },
            { label: "事業領域", value: `${services.length}事業` },
            { label: "募集職種", value: `${jobs.length}職種` },
            { label: "本社所在地", value: company.address?.split("（")[0].slice(0, 10) ?? "—" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xs tracking-widest text-stone-500">{s.label}</div>
              <div className="mt-2 font-serif text-2xl font-bold md:text-3xl">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Message */}
      <section id="message" className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-xs tracking-[0.4em] text-amber-700">MESSAGE</p>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">代表メッセージ</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-amber-700" />
          </div>
          <div className="rounded-sm border-l-4 border-amber-700 bg-white p-10 shadow-sm">
            <p className="font-serif text-lg leading-loose text-stone-700 md:text-xl">
              {company.mission ?? company.description ?? ""}
            </p>
            {company.ceo && (
              <p className="mt-8 text-right text-sm text-stone-600">
                代表取締役<span className="ml-4 font-serif text-lg font-bold text-stone-900">{company.ceo}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Company */}
      <section id="company" className="bg-stone-100 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs tracking-[0.4em] text-amber-700">COMPANY</p>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">会社情報</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-amber-700" />
          </div>
          <table className="w-full border-collapse bg-white text-sm md:text-base">
            <tbody>
              <tr className="border-b border-stone-200">
                <th className="w-1/3 bg-stone-50 px-6 py-5 text-left font-medium text-stone-600">会社名</th>
                <td className="px-6 py-5">{company.name}{company.name_en ? `（${company.name_en}）` : ""}</td>
              </tr>
              {company.founded && (
                <tr className="border-b border-stone-200">
                  <th className="bg-stone-50 px-6 py-5 text-left font-medium text-stone-600">設立</th>
                  <td className="px-6 py-5">{company.founded}</td>
                </tr>
              )}
              {company.ceo && (
                <tr className="border-b border-stone-200">
                  <th className="bg-stone-50 px-6 py-5 text-left font-medium text-stone-600">代表者</th>
                  <td className="px-6 py-5">{company.ceo}</td>
                </tr>
              )}
              {company.address && (
                <tr className="border-b border-stone-200">
                  <th className="bg-stone-50 px-6 py-5 text-left font-medium text-stone-600">所在地</th>
                  <td className="px-6 py-5">{company.address}</td>
                </tr>
              )}
              {company.description && (
                <tr>
                  <th className="bg-stone-50 px-6 py-5 text-left font-medium text-stone-600">事業内容</th>
                  <td className="px-6 py-5">{company.description}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Business */}
      <section id="business" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-xs tracking-[0.4em] text-amber-700">BUSINESS</p>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">事業内容</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-amber-700" />
          </div>
          <div className="space-y-12">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`grid gap-8 md:grid-cols-2 md:items-center ${i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-sm bg-gradient-to-br from-blue-900 to-blue-700 text-white">
                  <div className="text-center">
                    <div className="font-serif text-6xl font-bold opacity-30">{String(i + 1).padStart(2, "0")}</div>
                    <div className="mt-2 text-xs tracking-widest">BUSINESS</div>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-xs tracking-widest text-amber-700">事業 {String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mb-4 font-serif text-2xl font-bold md:text-3xl">{service.name}</h3>
                  <p className="leading-relaxed text-stone-700">{service.description}</p>
                  {service.target && (
                    <p className="mt-4 inline-block border border-stone-300 bg-white px-3 py-1 text-xs">
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
      <section id="jobs" className="bg-stone-100 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs tracking-[0.4em] text-amber-700">RECRUIT</p>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">募集要項</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-amber-700" />
          </div>
          <div className="space-y-6">
            {jobs.map((job) => (
              <details
                key={job.title}
                className="group border border-stone-300 bg-white"
                open
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 hover:bg-stone-50">
                  <div>
                    <h3 className="font-serif text-xl font-bold md:text-2xl">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
                      <span>● {job.employment_type}</span>
                      <span>● {job.location}</span>
                      {job.salary && <span>● {job.salary}</span>}
                    </div>
                  </div>
                  <span className="text-amber-700 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="border-t border-stone-200 p-6">
                  <p className="leading-relaxed text-stone-700">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-3 text-sm font-bold tracking-wider text-amber-700">必須要件</h4>
                      <ul className="space-y-2 text-sm text-stone-700">
                        {job.requirements.map((req) => (
                          <li key={req} className="flex gap-3 border-b border-stone-100 pb-2">
                            <span className="text-amber-700">◆</span>
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
      <section id="apply" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p className="text-xs tracking-[0.4em] text-amber-700">ENTRY</p>
            <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">エントリーフォーム</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-amber-700" />
          </div>
          <div className="border-t-2 border-amber-700 bg-white p-10 shadow-sm">
            <ApplicationForm
              variant="classic"
              accentClassName="focus:ring-blue-800 focus:border-blue-800"
              buttonClassName="bg-blue-900 text-white hover:bg-blue-800"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-amber-700 bg-stone-900 px-6 py-12 text-stone-300">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-serif text-lg font-bold text-white">{company.name}</p>
          {company.address && <p className="mt-2 text-xs">{company.address}</p>}
          <p className="mt-6 text-xs">© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
