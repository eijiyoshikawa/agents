"use client";

import type { BulletinCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

interface CategoryFilterProps {
  selected: BulletinCategory | "all";
  onChange: (category: BulletinCategory | "all") => void;
}

const categories: Array<{ key: BulletinCategory | "all"; label: string }> = [
  { key: "all", label: "すべて" },
  ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key: key as BulletinCategory,
    label: config.label,
  })),
];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none" role="tablist" aria-label="カテゴリフィルター">
      {categories.map((cat) => (
        <button
          key={cat.key}
          role="tab"
          aria-selected={selected === cat.key}
          onClick={() => onChange(cat.key)}
          className={`shrink-0 px-4 py-2 rounded-full text-base font-semibold transition-colors cursor-pointer ${
            selected === cat.key
              ? "bg-primary-500 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
