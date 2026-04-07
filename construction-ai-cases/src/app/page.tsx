import Hero from "@/components/Hero";
import CategorySection from "@/components/CategorySection";
import Footer from "@/components/Footer";
import { categories, useCases } from "@/data/useCases";

export default function Home() {
  return (
    <>
      <Hero />

      {/* カテゴリナビ */}
      <nav className="sticky top-0 z-10 border-b border-surface-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-3">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="whitespace-nowrap rounded-full border border-surface-border px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
            >
              {cat.name}
            </a>
          ))}
        </div>
      </nav>

      {/* 事例セクション */}
      <main id="cases" className="mx-auto max-w-6xl space-y-16 px-6 py-16">
        {categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            cases={useCases.filter((uc) => uc.categoryId === cat.id)}
          />
        ))}
      </main>

      <Footer />
    </>
  );
}
