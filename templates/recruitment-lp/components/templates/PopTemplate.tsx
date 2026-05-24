import type { CompanyData } from "@/lib/types";
import ApplicationForm from "@/components/common/ApplicationForm";

export default function PopTemplate({ data }: { data: CompanyData }) {
  const { company, services, jobs } = data;

  return (
    <main className="min-h-screen bg-yellow-50 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-yellow-50/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-full bg-pink-500" />
            <span className="text-lg font-extrabold">{company.name_en ?? company.name}</span>
          </div>
          <div className="hidden gap-6 text-sm font-bold md:flex">
            <a href="#about" className="hover:text-pink-500">ABOUT</a>
            <a href="#services" className="hover:text-pink-500">SERVICES</a>
            <a href="#jobs" className="hover:text-pink-500">JOBS</a>
            <a href="#apply" className="hover:text-pink-500">JOIN</a>
          </div>
          <a
            href="#apply"
            className="rounded-full bg-pink-500 px-6 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            応募する！
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-pink-300 opacity-60 blur-2xl" />
        <div className="absolute -right-10 top-1/2 h-72 w-72 rounded-full bg-cyan-300 opacity-60 blur-2xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-yellow-300 opacity-70 blur-2xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-block rounded-full bg-stone-900 px-5 py-2 text-xs font-extrabold tracking-widest text-yellow-300">
            ★ WE ARE HIRING ★
          </div>
          <h1 className="font-sans text-5xl font-black leading-tight tracking-tight md:text-7xl">
            <span className="inline-block rounded-2xl bg-pink-500 px-4 py-1 text-white">
              {company.tagline?.slice(0, 8) ?? "一緒に"}
            </span>
            <br />
            <span className="mt-3 inline-block">{company.tagline?.slice(8) ?? "つくろう、新しい未来。"}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-stone-700">
            {company.mission ?? company.description ?? ""}
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <a
              href="#jobs"
              className="rounded-full bg-stone-900 px-8 py-4 text-sm font-extrabold text-yellow-300 shadow-[6px_6px_0_0_rgba(236,72,153,1)] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(236,72,153,1)]"
            >
              JOBSを見る →
            </a>
            <a
              href="#about"
              className="rounded-full border-4 border-stone-900 bg-white px-8 py-4 text-sm font-extrabold text-stone-900 hover:bg-stone-900 hover:text-white"
            >
              わたしたちのこと
            </a>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y-4 border-stone-900 bg-pink-500 py-4">
        <div className="flex animate-[marquee_20s_linear_infinite] gap-12 whitespace-nowrap text-2xl font-black text-white">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>★ WE ARE HIRING ★ ENJOY YOUR WORK ★ JOIN US ★ HAVE FUN ★</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      {/* About */}
      <section id="about" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-block -rotate-2 rounded bg-yellow-300 px-3 py-1 text-xs font-extrabold">
                ABOUT US
              </div>
              <h2 className="text-4xl font-black md:text-5xl">わたしたちのこと。</h2>
            </div>
          </div>
          <div className="rounded-3xl border-4 border-stone-900 bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-12">
            <p className="text-lg font-medium leading-relaxed text-stone-700 md:text-xl">
              {company.description}
            </p>
            <div className="mt-8 grid gap-6 border-t-2 border-dashed border-stone-300 pt-6 md:grid-cols-3">
              {company.founded && (
                <div>
                  <div className="text-xs font-bold text-pink-500">FOUNDED</div>
                  <div className="mt-1 text-xl font-black">{company.founded}</div>
                </div>
              )}
              {company.ceo && (
                <div>
                  <div className="text-xs font-bold text-pink-500">CEO</div>
                  <div className="mt-1 text-xl font-black">{company.ceo}</div>
                </div>
              )}
              {company.address && (
                <div>
                  <div className="text-xs font-bold text-pink-500">WHERE</div>
                  <div className="mt-1 text-base font-bold">{company.address}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-cyan-200 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <div className="mb-2 inline-block rotate-1 rounded bg-stone-900 px-3 py-1 text-xs font-extrabold text-yellow-300">
              WHAT WE DO
            </div>
            <h2 className="text-4xl font-black md:text-5xl">やってること。</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, i) => {
              const colors = ["bg-pink-400", "bg-yellow-300", "bg-white"];
              const rotations = ["-rotate-1", "rotate-1", "-rotate-1"];
              return (
                <div
                  key={service.name}
                  className={`${colors[i % colors.length]} ${rotations[i % rotations.length]} rounded-3xl border-4 border-stone-900 p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition hover:rotate-0`}
                >
                  <div className="mb-4 inline-block rounded-full bg-stone-900 px-4 py-1 text-xs font-extrabold text-yellow-300">
                    No.{String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 text-2xl font-black">{service.name}</h3>
                  <p className="font-medium leading-relaxed text-stone-800">{service.description}</p>
                  {service.target && (
                    <p className="mt-4 inline-block rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white">
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
      <section id="jobs" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mb-2 inline-block -rotate-2 rounded bg-pink-500 px-3 py-1 text-xs font-extrabold text-white">
              OPEN POSITIONS
            </div>
            <h2 className="text-4xl font-black md:text-5xl">募集中のしごと。</h2>
          </div>
          <div className="space-y-6">
            {jobs.map((job, i) => {
              const bgColors = ["bg-pink-100", "bg-yellow-100", "bg-cyan-100"];
              return (
                <div
                  key={job.title}
                  className={`${bgColors[i % bgColors.length]} rounded-3xl border-4 border-stone-900 p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)]`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-black">{job.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border-2 border-stone-900 bg-white px-3 py-1 text-xs font-bold">
                          {job.employment_type}
                        </span>
                        <span className="rounded-full border-2 border-stone-900 bg-white px-3 py-1 text-xs font-bold">
                          {job.location}
                        </span>
                      </div>
                    </div>
                    {job.salary && (
                      <div className="rounded-2xl bg-stone-900 px-4 py-2 text-yellow-300">
                        <div className="text-xs">SALARY</div>
                        <div className="font-black">{job.salary}</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-6 font-medium leading-relaxed text-stone-700">{job.description}</p>
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-3 text-xs font-extrabold tracking-widest text-pink-600">REQUIREMENTS</div>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req) => (
                          <span
                            key={req}
                            className="rounded-full border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold"
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
      <section id="apply" className="bg-pink-500 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center text-white">
            <div className="mb-2 inline-block rotate-2 rounded bg-yellow-300 px-3 py-1 text-xs font-extrabold text-stone-900">
              JOIN US
            </div>
            <h2 className="text-4xl font-black md:text-5xl">いっしょに、はじめよう。</h2>
            <p className="mt-6 font-medium">気になったら、まずはここから！</p>
          </div>
          <div className="rounded-3xl border-4 border-stone-900 bg-white p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
            <ApplicationForm
              variant="pop"
              accentClassName="focus:ring-pink-500 focus:border-pink-500"
              buttonClassName="bg-stone-900 text-yellow-300 hover:bg-stone-800"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 px-6 py-12 text-yellow-300">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xl font-black">{company.name_en ?? company.name}</p>
          <p className="mt-2 text-xs">© {new Date().getFullYear()} {company.name}. Have fun!</p>
        </div>
      </footer>
    </main>
  );
}
