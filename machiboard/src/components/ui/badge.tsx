import type { BulletinCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

interface BadgeProps {
  category: BulletinCategory;
}

export function CategoryBadge({ category }: BadgeProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${config.color} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}

interface CountBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: CountBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-6 h-6 rounded-full bg-error text-white text-sm font-bold px-1.5"
      aria-label={`${count}件の未読`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
