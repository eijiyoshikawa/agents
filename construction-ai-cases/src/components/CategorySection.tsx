import {
  HardHat,
  ShieldCheck,
  Ruler,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import type { Category, UseCase } from "@/data/useCases";
import UseCaseCard from "./UseCaseCard";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat,
  ShieldCheck,
  Ruler,
  Briefcase,
  GraduationCap,
};

export default function CategorySection({
  category,
  cases,
}: {
  category: Category;
  cases: UseCase[];
}) {
  const Icon = iconMap[category.icon] ?? HardHat;

  return (
    <section id={category.id} className="scroll-mt-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-primary">{category.name}</h2>
          <p className="text-sm text-muted">{category.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {cases.map((uc) => (
          <UseCaseCard key={uc.id} uc={uc} />
        ))}
      </div>
    </section>
  );
}
