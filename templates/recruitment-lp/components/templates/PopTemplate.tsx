import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function PopTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-construction-400 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-stone-900 bg-construction-400">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-6 w-6 bg-stone-900" />
            <span className="text-lg font-extrabold tracking-tight">{company.name_en ?? company.name}</span>
          </div>
          <div className="hidden gap-6 text-sm font-bold md:flex">
            <a href="#about" className="hover:text-safety-600">ABOUT</a>
            <a href="#services" className="hover:text-safety-600">WORK</a>
            <a href="#jobs" className="hover:text-safety-600">JOBS</a>
            <a href="#apply" className="hover:text-safety-600">JOIN</a>
          </div>
          <a
            href="#apply"
            className="bg-stone-900 px-6 py-3 text-sm font-extrabold text-construction-400 shadow-[4px_4px_0_0_rgba(234,88,12,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
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
      <section className="relative overflow-hidden px-6 py-20 md:py-28">
        <div className="absolute left-10 top-10 hidden h-32 w-32 border-8 border-stone-900 md:block" />
        <div className="absolute right-20 bottom-10 hidden h-20 w-20 rotate-45 bg-safety-500 md:block" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-block bg-stone-900 px-5 py-2 text-xs font-extrabold tracking-widest text-construction-400">
            ★ 仲間募集中 ★
          </div>
          <h1 className="font-sans text-5xl font-black leading-tight tracking-tight md:text-7xl">
            <span className="inline-block bg-stone-900 px-4 py-1 text-construction-400">
              {company.tagline?.slice(0, 8) ?? "つくるのは、"}
            </span>
            <br />
            <span className="mt-3 inline-block">{company.tagline?.slice(8) ?? "街と、暮らし。"}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-stone-800">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <a
              href="#jobs"
              className="bg-stone-900 px-8 py-4 text-sm font-extrabold tracking-wider text-construction-400 shadow-[6px_6px_0_0_rgba(234,88,12,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(234,88,12,1)]"
            >
              JOBSを見る →
            </a>
            <a
              href="#about"
              className="border-4 border-stone-900 bg-white px-8 py-4 text-sm font-extrabold text-stone-900 hover:bg-stone-900 hover:text-construction-400"
            >
              わたしたちのこと
            </a>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y-4 border-stone-900 bg-stone-900 py-4">
        <div className="flex animate-[marquee_20s_linear_infinite] gap-12 whitespace-nowrap text-2xl font-black text-construction-400">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>★ WE ARE HIRING ★ つくる人、求む ★ JOIN US ★ 現場で会おう ★</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      {/* About */}
      <section id="about" className="bg-construction-400 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-block -rotate-2 bg-safety-500 px-3 py-1 text-xs font-extrabold text-white">
                ABOUT US
              </div>
              <h2 className="text-4xl font-black md:text-5xl">わたしたちのこと。</h2>
            </div>
          </div>
          <div className="border-4 border-stone-900 bg-white p-8 shadow-[8px_8px_0_0_rgba(10,10,10,1)] md:p-12">
            <p className="text-lg font-medium leading-relaxed text-stone-700 md:text-xl">
              {company.description}
            </p>
            <div className="mt-8 grid gap-6 border-t-2 border-dashed border-stone-300 pt-6 md:grid-cols-3">
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
      <section id="services" className="bg-stone-900 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <div className="mb-2 inline-block rotate-1 bg-construction-400 px-3 py-1 text-xs font-extrabold text-stone-900">
              OUR WORK
            </div>
            <h2 className="text-4xl font-black text-construction-400 md:text-5xl">やってる、しごと。</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, i) => {
              const colors = ["bg-safety-500", "bg-construction-400", "bg-white"];
              const rotations = ["-rotate-1", "rotate-1", "-rotate-1"];
              const textColors = ["text-white", "text-stone-900", "text-stone-900"];
              return (
                <div
                  key={service.name}
                  className={`${colors[i % colors.length]} ${rotations[i % rotations.length]} ${textColors[i % textColors.length]} border-4 border-stone-900 p-8 shadow-[8px_8px_0_0_rgba(251,191,36,1)] transition hover:rotate-0`}
                >
                  <div className="mb-4 inline-block bg-stone-900 px-4 py-1 text-xs font-extrabold text-construction-400">
                    No.{String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 text-2xl font-black">{service.name}</h3>
                  <p className="font-medium leading-relaxed">{service.description}</p>
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
      <section id="jobs" className="bg-construction-400 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mb-2 inline-block -rotate-2 bg-safety-500 px-3 py-1 text-xs font-extrabold text-white">
              OPEN POSITIONS
            </div>
            <h2 className="text-4xl font-black md:text-5xl">募集中の、しごと。</h2>
          </div>
          <div className="space-y-6">
            {jobs.map((job, i) => {
              const bgColors = ["bg-white", "bg-cream-50", "bg-white"];
              return (
                <div
                  key={job.title}
                  className={`${bgColors[i % bgColors.length]} border-4 border-stone-900 p-8 shadow-[8px_8px_0_0_rgba(10,10,10,1)]`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black">{job.title}</h3>
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
                      <div className="bg-stone-900 px-4 py-2 text-construction-400">
                        <div className="text-xs">SALARY</div>
                        <div className="font-black">{job.salary}</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-6 font-medium leading-relaxed text-stone-700">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-3 text-xs font-extrabold tracking-widest text-safety-600">REQUIREMENTS</div>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req) => (
                          <span
                            key={req}
                            className="border-2 border-stone-900 bg-construction-400 px-4 py-2 text-sm font-bold"
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
      <section id="apply" className="bg-safety-500 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center text-white">
            <div className="mb-2 inline-block rotate-2 bg-construction-400 px-3 py-1 text-xs font-extrabold text-stone-900">
              JOIN US
            </div>
            <h2 className="text-4xl font-black md:text-5xl">いっしょに、つくろう。</h2>
            <p className="mt-6 font-medium">気になったら、まずはここから！</p>
          </div>
          <div className="border-4 border-stone-900 bg-white p-10 shadow-[10px_10px_0_0_rgba(10,10,10,1)]">
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
