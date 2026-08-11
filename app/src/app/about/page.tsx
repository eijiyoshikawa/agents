import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "サイトについて",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">サイトについて</h1>

      <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">本サイトの目的</h2>
          <p className="mt-2">
            本サイトは、ドライバー・建設・製造業などノンデスク産業に特化した求人ポータルサイトです。
            デスクワーク以外の現場で働く方々が、より自分に合った仕事を見つけやすくすることを目的としています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">掲載求人について</h2>
          <p className="mt-2">
            本サイトでは、企業様から直接掲載いただく求人に加え、ハローワーク（公共職業安定所）に掲載されている求人情報を、
            厚生労働省職業安定局の定めるガイドラインに基づき適切に転載しています。
          </p>
          <p className="mt-2">
            ハローワーク求人の情報は、ハローワークインターネットサービスから取得したものであり、
            最新の情報はハローワークの公式サイトでご確認ください。
            転載にあたっては、出典元の明示および情報の正確性の確保に努めています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">運営事業者情報</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900 w-1/3">
                    事業者名
                  </th>
                  <td className="px-4 py-3">株式会社サンプル</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    代表者
                  </th>
                  <td className="px-4 py-3">山田 太郎</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    所在地
                  </th>
                  <td className="px-4 py-3">
                    〒100-0001 東京都千代田区千代田1-1-1 サンプルビル3F
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    電話番号
                  </th>
                  <td className="px-4 py-3">03-0000-0000</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    メールアドレス
                  </th>
                  <td className="px-4 py-3">info@example.com</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    有料職業紹介事業許可番号
                  </th>
                  <td className="px-4 py-3">13-ユ-000000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
