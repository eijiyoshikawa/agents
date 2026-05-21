import { cityData } from "@/lib/content";
import SectionHeading from "@/components/ui/SectionHeading";
import StatCard from "@/components/ui/StatCard";

export default function CityData() {
  return (
    <section id="citydata" className="bg-white px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          title={cityData.sectionTitle}
          subtitle={cityData.subtitle}
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {cityData.items.map((item) => (
            <StatCard
              key={item.label}
              value={item.value}
              unit={item.unit}
              label={item.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
