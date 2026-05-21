import Link from "next/link";
import { UnreadBadge } from "@/components/ui/badge";

interface HeaderProps {
  organizationName?: string;
  unreadCount?: number;
}

export function Header({ organizationName, unreadCount = 0 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-700">まちボード</span>
        </Link>

        {organizationName && (
          <span className="text-base text-neutral-500 truncate max-w-40">
            {organizationName}
          </span>
        )}

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 text-base text-neutral-700">
              未読 <UnreadBadge count={unreadCount} />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
