import Link from "next/link"
import { CheckCircle, ArrowRight } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "企業の採用担当者の方へ",
  description:
    "掲載無料・成果報酬型の求人掲載。ノンデスク産業に特化した求人ポータルで、ドライバー・建設・製造業の人材を採用。",
}

const features = [
  {
    title: "掲載無料",
    description:
      "求人の掲載は完全無料。初期費用・月額費用は一切かかりません。採用が決まるまで費用ゼロでご利用いただけます。",
  },
  {
    title: "成果報酬型（1人あたり10万円〜）",
    description:
      "採用が決まった場合のみ費用が発生する成果報酬型。採用コストを最適化し、無駄のない採用活動を実現します。",
  },
  {
    title: "スカウト機能",
    description:
      "登録求職者のプロフィールを閲覧し、条件に合う人材に直接スカウトメッセージを送信。攻めの採用が可能です。",
  },
  {
    title: "専用管理画面",
    description:
      "求人の掲載・編集、応募者の管理、スカウト送信、採用状況の分析まで、すべてひとつの管理画面で完結します。",
  },
]

const steps = [
  {
    number: "1",
    title: "無料登録",
    description: "企業情報を入力して、最短5分で登録完了。審査後すぐにご利用開始いただけます。",
  },
  {
    number: "2",
    title: "求人掲載",
    description: "テンプレートに沿って求人情報を入力するだけ。写真や動画の掲載も可能です。",
  },
  {
    number: "3",
    title: "採用",
    description: "応募者とのやり取りは管理画面で一元管理。採用決定後に成果報酬をお支払いください。",
  },
]

export default function ForEmployersPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            掲載無料・成果報酬型の
            <br />
            求人掲載
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            ドライバー・建設・製造業に特化した求人ポータル。
            採用が決まるまで費用はかかりません。
          </p>
          <Link
            href="/company/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg hover:bg-blue-50 transition"
          >
            無料で掲載を始める
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            選ばれる4つの理由
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            かんたん3ステップ
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            まずは無料登録から
          </h2>
          <p className="mt-2 text-gray-600">
            最短5分で登録完了。掲載料は一切かかりません。
          </p>
          <Link
            href="/company/register"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition"
          >
            無料で企業登録する
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
