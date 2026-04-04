import { hero } from "@/lib/content";

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 pt-16 text-center">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-orange-50 to-warm-bg" />
      <p className="mb-4 text-sm font-medium tracking-widest text-accent-orange uppercase">
        {hero.subtitle}
      </p>
      <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-text-primary md:text-5xl">
        {hero.tagline}
      </h1>
      <p className="mt-6 max-w-md text-lg text-text-secondary">
        {hero.description}
      </p>
      <a
        href="#cta"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent-orange px-8 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-accent-orange-dark"
      >
        {hero.cta}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </section>
  );
}
