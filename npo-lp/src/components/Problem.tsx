import { problem } from "@/lib/content";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function Problem() {
  return (
    <section id="problem" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={problem.sectionTitle} />

        <div className="mb-10 flex flex-wrap justify-center gap-6">
          {problem.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <span className="text-4xl font-bold text-accent-orange">
                {stat.value}
              </span>
              <span className="ml-1 text-lg text-text-secondary">
                {stat.unit}
              </span>
              <p className="mt-1 text-sm text-text-secondary">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {problem.issues.map((issue) => (
            <Card key={issue.title}>
              <div className="mb-3 text-3xl">{issue.icon}</div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">
                {issue.title}
              </h3>
              <p className="text-sm text-text-secondary">{issue.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-orange-50 p-6">
          <p className="mb-3 text-center text-sm font-bold text-accent-orange-dark">
            子ども食堂は食事の場だけではありません
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {problem.necessity.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
