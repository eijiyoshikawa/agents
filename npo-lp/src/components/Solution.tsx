import { solution } from "@/lib/content";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function Solution() {
  return (
    <section id="solution" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          title={solution.sectionTitle}
          subtitle={solution.description}
        />

        <div className="mb-8 rounded-2xl bg-accent-orange p-6 text-center">
          <p className="text-sm font-medium text-orange-100">目標</p>
          <p className="mt-1 text-xl font-extrabold text-white md:text-2xl">
            {solution.goal}
          </p>
        </div>

        <div className="grid gap-4">
          {solution.items.map((item) => (
            <Card key={item.problem} className="flex items-center gap-4">
              <div className="flex-shrink-0 rounded-xl bg-red-50 px-4 py-3 text-center">
                <p className="text-xs text-red-400">課題</p>
                <p className="text-sm font-bold text-red-600">{item.problem}</p>
              </div>
              <div className="text-2xl text-text-secondary" aria-hidden="true">
                &rarr;
              </div>
              <div>
                <p className="text-xs text-accent-green">解決策</p>
                <p className="text-sm font-medium text-text-primary">
                  {item.solution}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-text-secondary">
          {solution.funding}
        </p>
      </div>
    </section>
  );
}
