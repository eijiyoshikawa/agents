import { businessPlans } from "@/lib/content";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

export default function BusinessPlans() {
  const { kikurage, warehouse } = businessPlans;

  return (
    <section id="business" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title={businessPlans.sectionTitle} />

        {/* Kikurage */}
        <div className="mb-12">
          <h3 className="mb-6 text-xl font-bold text-accent-green">
            🍄 {kikurage.title}
          </h3>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {kikurage.revenue.map((item) => (
              <Card
                key={item.label}
                className={
                  item.highlight
                    ? "border-2 border-accent-green bg-green-50"
                    : ""
                }
              >
                <p className="text-xs text-text-secondary">{item.label}</p>
                <p
                  className={`text-2xl font-bold ${
                    item.highlight ? "text-accent-green" : "text-text-primary"
                  }`}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-text-secondary">{item.note}</p>
              </Card>
            ))}
          </div>

          <Card>
            <p className="mb-3 text-xs font-bold text-text-secondary uppercase">
              選定理由
            </p>
            <ul className="grid gap-2 text-sm text-text-primary md:grid-cols-2">
              {kikurage.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent-green">✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          </Card>

          <p className="mt-4 text-center text-sm text-text-secondary">
            初期費用: <span className="font-bold text-text-primary">{kikurage.initialCost}</span>
          </p>
        </div>

        {/* Warehouse */}
        <div>
          <h3 className="mb-4 text-xl font-bold text-accent-orange">
            🏭 {warehouse.title}
          </h3>
          <p className="mb-6 text-sm text-text-secondary">
            {warehouse.description}
          </p>

          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {warehouse.features.map((feature) => (
              <span
                key={feature}
                className="rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-accent-orange-dark"
              >
                {feature}
              </span>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {warehouse.costs.map((cost) => (
              <Card key={cost.label} className="text-center">
                <p className="text-xs text-text-secondary">{cost.label}</p>
                <p className="text-xl font-bold text-text-primary">
                  {cost.value}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-accent-orange p-5 text-center">
            <p className="text-sm text-orange-100">初期概算総費</p>
            <p className="text-3xl font-extrabold text-white">
              {warehouse.totalCost}
            </p>
            <p className="mt-2 text-xs text-orange-200">
              補助金・助成金・ふるさと納税型CFで資金調達
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
