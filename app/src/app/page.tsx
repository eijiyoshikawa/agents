import Link from "next/link"
import { Search, Truck, HardHat, Factory, ArrowRight } from "lucide-react"

const categories = [
  { key: "driver", label: "ドライバー・運転手", icon: Truck, color: "bg-blue-50 text-blue-700" },
  { key: "construction", label: "建設・土木", icon: HardHat, color: "bg-orange-50 text-orange-700" },
  { key: "manufacturing", label: "製造・工場", icon: Factory, color: "bg-green-50 text-green-700" },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            ノンデスク産業の
            <br className="sm:hidden" />
            求人を探す
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            ドライバー・建設・製造業に特化。ハローワーク求人も掲載中。
          </p>

          {/* Search Form */}
          <form
            action="/jobs"
            method="GET"
            className="mx-auto mt-8 flex max-w-2xl gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="q"
                placeholder="職種・キーワードで検索"
                className="w-full rounded-lg border-0 py-3 pl-10 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
            >
              検索
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900">職種から探す</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                href={`/jobs?category=${cat.key}`}
                className={`flex items-center gap-4 rounded-lg border p-5 transition hover:shadow-md ${cat.color}`}
              >
                <cat.icon className="h-8 w-8" />
                <div>
                  <p className="font-semibold">{cat.label}</p>
                  <p className="text-sm opacity-75">求人を見る →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                企業の採用担当者の方へ
              </h2>
              <p className="mt-1 text-gray-600">
                掲載無料・成果報酬型。採用が決まるまで費用はかかりません。
              </p>
            </div>
            <Link
              href="/for-employers"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              詳しく見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
