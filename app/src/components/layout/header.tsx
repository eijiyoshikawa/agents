import Link from "next/link"
import { Truck } from "lucide-react"

export function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Truck className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">求人ポータル</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/jobs"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              求人検索
            </Link>
            <Link
              href="/for-employers"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              企業の方へ
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
