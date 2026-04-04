import { benefits } from "@/lib/content";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function Benefits() {
  return (
    <section id="benefits" className="bg-white px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={benefits.sectionTitle} />

        <blockquote className="mb-10 border-l-4 border-accent-orange pl-4 text-base font-medium italic text-text-primary md:text-lg">
          {benefits.quote}
        </blockquote>

        <div className="grid gap-4 md:grid-cols-2">
          {benefits.items.map((item) => (
            <Card key={item.title}>
              <div className="mb-3 text-3xl">{item.icon}</div>
              <h3 className="mb-2 text-base font-bold text-text-primary">
                {item.title}
              </h3>
              <p className="text-sm text-text-secondary">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
