import { cta } from "@/lib/content";

export default function CallToAction() {
  return (
    <section
      id="cta"
      className="bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-extrabold text-text-primary md:text-3xl">
          {cta.sectionTitle}
        </h2>
        <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-accent-orange" />
        <p className="mt-6 text-base text-text-secondary">{cta.description}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {cta.roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-accent-orange shadow-sm"
            >
              {role}
            </span>
          ))}
        </div>

        <div className="mt-10">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-accent-orange px-10 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-accent-orange-dark"
          >
            お問い合わせはこちら
            <span aria-hidden="true">&rarr;</span>
          </a>
          <p className="mt-4 text-xs text-text-secondary">
            LINE・メール・お電話でお気軽にご連絡ください
          </p>
        </div>
      </div>
    </section>
  );
}
