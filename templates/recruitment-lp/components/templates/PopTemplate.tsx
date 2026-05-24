import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function PopTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-construction-400 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-stone-900 bg-construction-400">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-block h-5 w-5 shrink-0 bg-stone-900 sm:h-6 sm:w-6" />
            <span className="truncate text-sm font-extrabold tracking-tight sm:text-lg">{company.name_en ?? company.name}</span>
          </div>
          <div className="hidden gap-6 text-sm font-bold md:flex">
            <a href="#about" className="hover:text-safety-600">ABOUT</a>
            <a href="#services" className="hover:text-safety-600">WORK</a>
            <a href="#jobs" className="hover:text-safety-600">JOBS</a>
            <a href="#apply" className="hover:text-safety-600">JOIN</a>
          </div>
          <a
            href="#apply"
            className="shrink-0 bg-stone-900 px-3 py-2 text-xs font-extrabold text-construction-400 shadow-[3px_3px_0_0_rgba(234,88,12,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none sm:px-6 sm:py-3 sm:text-sm sm:shadow-[4px_4px_0_0_rgba(234,88,12,1)]"
          >
            応募する！
          </a>
        </nav>
      </header>

      {/* Caution Tape Strip */}
      <div
        className="h-4"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #0A0A0A 0 24px, #FBBF24 24px 48px)",
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 py-16 sm:px-6 sm:py-20 md:py-28">
        <div className="absolute left-10 top-10 hidden h-32 w-32 border-8 border-stone-900 md:block" />
        <div className="absolute right-20 bottom-10 hidden h-20 w-20 rotate-45 bg-safety-500 md:block" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-block bg-stone-900 px-4 py-2 text-[10px] font-extrabold tracking-widest text-construction-400 sm:px-5 sm:text-xs">
            ★ 仲間募集中 ★
          </div>
          <h1 className="font-sans text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl md:text-7xl">
            <span className="bg-stone-900 box-decoration-clone px-3 py-1 text-construction-400 sm:px-4">
              {company.tagline ?? "つくるのは、街と、暮らし。"}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium text-stone-800 sm:mt-8 sm:text-lg">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-12">
            <a
              href="#jobs"
              className="bg-stone-900 px-6 py-3.5 text-sm font-extrabold tracking-wider text-construction-400 shadow-[5px_5px_0_0_rgba(234,88,12,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(234,88,12,1)] sm:px-8 sm:py-4 sm:shadow-[6px_6px_0_0_rgba(234,88,12,1)]"
            >
              JOBSを見る →
            </a>
            <a
              href="#about"
              className="border-4 border-stone-900 bg-white px-6 py-3.5 text-sm font-extrabold text-stone-900 hover:bg-stone-900 hover:text-construction-400 sm:px-8 sm:py-4"
            >
              わたしたちのこと
            </a>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y-4 border-stone-900 bg-stone-900 py-3 sm:py-4">
        <div className="flex animate-[marquee_20s_linear_infinite] gap-8 whitespace-nowrap text-xl font-black text-construction-400 sm:gap-12 sm:text-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>★ WE ARE HIRING ★ つくる人、求む ★ JOIN US ★ 現場で会おう ★</span>
          ))}
        </div>
      </div>

      {/* About */}
      <section id="about" className="bg-construction-400 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-12">
            <div>
              <div className="mb-2 inline-block -rotate-2 bg-safety-500 px-3 py-1 text-[10px] font-extrabold text-white sm:text-xs">
                ABOUT US
              </div>
              <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">わたしたちのこと。</h2>
            </div>
          </div>
          <div className="border-4 border-stone-900 bg-white p-6 shadow-[6px_6px_0_0_rgba(10,10,10,1)] sm:p-8 sm:shadow-[8px_8px_0_0_rgba(10,10,10,1)] md:p-12">
            <p className="text-base font-medium leading-relaxed text-stone-700 sm:text-lg md:text-xl">
              {company.description}
            </p>
            <div className="mt-6 grid gap-5 border-t-2 border-dashed border-stone-300 pt-5 sm:mt-8 sm:gap-6 sm:pt-6 md:grid-cols-3">
              {company.founded && (
                <div>
                  <div className="text-xs font-bold text-safety-600">FOUNDED</div>
                  <div className="mt-1 text-xl font-black">{company.founded}</div>
                </div>
              )}
              {company.ceo && (
                <div>
                  <div className="text-xs font-bold text-safety-600">CEO</div>
                  <div className="mt-1 text-xl font-black">{company.ceo}</div>
                </div>
              )}
              {company.address && (
                <div>
                  <div className="text-xs font-bold text-safety-600">WHERE</div>
                  <div className="mt-1 text-base font-bold">{company.address}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-stone-900 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 md:mb-12">
            <div className="mb-2 inline-block rotate-1 bg-construction-400 px-3 py-1 text-[10px] font-extrabold text-stone-900 sm:text-xs">
              OUR WORK
            </div>
            <h2 className="text-3xl font-black text-construction-400 sm:text-4xl md:text-5xl">やってる、しごと。</h2>
          </div>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {services.map((service, i) => {
              const colors = ["bg-safety-500", "bg-construction-400", "bg-white"];
              const rotations = ["sm:-rotate-1", "sm:rotate-1", "sm:-rotate-1"];
              const textColors = ["text-white", "text-stone-900", "text-stone-900"];
              return (
                <div
                  key={service.name}
                  className={`${colors[i % colors.length]} ${rotations[i % rotations.length]} ${textColors[i % textColors.length]} border-4 border-stone-900 p-6 shadow-[6px_6px_0_0_rgba(251,191,36,1)] transition hover:rotate-0 sm:p-8 sm:shadow-[8px_8px_0_0_rgba(251,191,36,1)]`}
                >
                  <div className="mb-4 inline-block bg-stone-900 px-3 py-1 text-[10px] font-extrabold text-construction-400 sm:px-4 sm:text-xs">
                    No.{String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 text-xl font-black sm:text-2xl">{service.name}</h3>
                  <p className="text-sm font-medium leading-relaxed sm:text-base">{service.description}</p>
                  {service.target && (
                    <p className="mt-4 inline-block bg-stone-900 px-3 py-1 text-xs font-bold text-white">
                      for {service.target}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section id="jobs" className="bg-construction-400 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center md:mb-12">
            <div className="mb-2 inline-block -rotate-2 bg-safety-500 px-3 py-1 text-[10px] font-extrabold text-white sm:text-xs">
              OPEN POSITIONS
            </div>
            <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">募集中の、しごと。</h2>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {jobs.map((job, i) => {
              const bgColors = ["bg-white", "bg-cream-50", "bg-white"];
              return (
                <div
                  key={job.title}
                  className={`${bgColors[i % bgColors.length]} border-4 border-stone-900 p-6 shadow-[6px_6px_0_0_rgba(10,10,10,1)] sm:p-8 sm:shadow-[8px_8px_0_0_rgba(10,10,10,1)]`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-black sm:text-3xl">{job.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="border-2 border-stone-900 bg-construction-400 px-3 py-1 text-xs font-bold">
                          {job.employment_type}
                        </span>
                        <span className="border-2 border-stone-900 bg-white px-3 py-1 text-xs font-bold">
                          {job.location}
                        </span>
                      </div>
                    </div>
                    {job.salary && (
                      <div className="self-start bg-stone-900 px-4 py-2 text-construction-400">
                        <div className="text-xs">SALARY</div>
                        <div className="text-sm font-black sm:text-base">{job.salary}</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-5 text-sm font-medium leading-relaxed text-stone-700 sm:mt-6 sm:text-base">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-5 sm:mt-6">
                      <div className="mb-3 text-[10px] font-extrabold tracking-widest text-safety-600 sm:text-xs">REQUIREMENTS</div>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req) => (
                          <span
                            key={req}
                            className="border-2 border-stone-900 bg-construction-400 px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm"
                          >
                            ＃{req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="bg-safety-500 px-5 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center text-white md:mb-12">
            <div className="mb-2 inline-block rotate-2 bg-construction-400 px-3 py-1 text-[10px] font-extrabold text-stone-900 sm:text-xs">
              JOIN US
            </div>
            <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">いっしょに、つくろう。</h2>
            <p className="mt-5 text-sm font-medium sm:mt-6 sm:text-base">気になったら、まずはここから！</p>
          </div>
          <div className="border-4 border-stone-900 bg-white p-6 shadow-[8px_8px_0_0_rgba(10,10,10,1)] sm:p-10 sm:shadow-[10px_10px_0_0_rgba(10,10,10,1)]">
            <ApplicationForm
              variant="pop"
              accentClassName="focus:ring-safety-500 focus:border-safety-500"
              buttonClassName="bg-stone-900 text-construction-400 hover:bg-stone-800"
            />
          </div>
        </div>
      </section>

      {/* Caution Tape Strip */}
      <div
        className="h-4"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #0A0A0A 0 24px, #FBBF24 24px 48px)",
        }}
      />

      {/* Footer */}
      <footer className="bg-stone-900 px-6 py-12 text-construction-400">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xl font-black">{company.name_en ?? company.name}</p>
          <p className="mt-2 text-xs opacity-75">© {new Date().getFullYear()} {company.name}. つくる人、ありがとう。</p>
        </div>
      </footer>
    </main>
  );
}
