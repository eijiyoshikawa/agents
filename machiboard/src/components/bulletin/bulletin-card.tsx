import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Bulletin } from "@/lib/types/database";

interface BulletinCardProps {
  bulletin: Bulletin;
}

export function BulletinCard({ bulletin }: BulletinCardProps) {
  const isRead = bulletin.is_read ?? false;
  const readRate =
    bulletin.member_count && bulletin.member_count > 0
      ? Math.round(((bulletin.read_count ?? 0) / bulletin.member_count) * 100)
      : 0;

  const timeAgo = bulletin.published_at
    ? formatDistanceToNow(new Date(bulletin.published_at), {
        addSuffix: true,
        locale: ja,
      })
    : "";

  return (
    <Link href={`/bulletin/${bulletin.id}`} className="block">
      <Card variant={isRead ? "default" : "unread"}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={bulletin.category} />
            {bulletin.priority === "urgent" && (
              <span className="text-sm font-bold text-error">緊急</span>
            )}
            <span className="text-sm text-neutral-500 ml-auto">{timeAgo}</span>
          </div>

          <h3 className="text-xl font-bold text-neutral-900 leading-snug">
            {bulletin.title}
          </h3>

          <div className="flex items-center justify-between text-base text-neutral-500">
            <span>{bulletin.author?.display_name ?? "管理者"}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${readRate}%` }}
                  role="progressbar"
                  aria-valuenow={readRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`既読率${readRate}%`}
                />
              </div>
              <span className="text-sm font-semibold">{readRate}%</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
