import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "プライバシーポリシー",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2025年1月1日</p>

      <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
        <p>
          株式会社サンプル（以下「当社」といいます）は、個人情報の保護に関する法律（個人情報保護法）その他の関連法令を遵守し、以下のとおり個人情報の取扱いについて定めます。
        </p>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            1. 収集する情報
          </h2>
          <p className="mt-2">
            当社は、本サービスの提供にあたり、以下の個人情報を収集することがあります。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>氏名、メールアドレス、電話番号等の連絡先情報</li>
            <li>生年月日、性別、住所等の属性情報</li>
            <li>職務経歴、保有資格、希望条件等の求職に関する情報</li>
            <li>アクセスログ、IPアドレス、ブラウザ情報等の利用環境情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 利用目的</h2>
          <p className="mt-2">
            収集した個人情報は、以下の目的で利用いたします。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>求人情報の提供および求職活動の支援</li>
            <li>求人企業への応募情報の提供</li>
            <li>本サービスの運営・改善・新機能開発</li>
            <li>お問い合わせへの対応</li>
            <li>サービスに関するお知らせの送付</li>
            <li>統計データの作成（個人を特定できない形式）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            3. 第三者提供
          </h2>
          <p className="mt-2">
            当社は、以下の場合を除き、利用者の同意なく個人情報を第三者に提供いたしません。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>利用者が求人に応募した場合の、当該求人企業への応募情報の提供</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護に必要な場合</li>
            <li>
              業務委託先に対して、利用目的の達成に必要な範囲で個人情報を提供する場合
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. Cookieの利用
          </h2>
          <p className="mt-2">
            本サービスでは、利用者の利便性向上およびサービス改善のためにCookieを使用しています。
            Cookieはブラウザの設定により無効にすることが可能ですが、一部の機能が正常に動作しなくなる場合があります。
            また、アクセス解析ツール（Google Analytics等）を利用しており、これらのツールがCookieを使用してアクセス情報を収集する場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. 安全管理措置
          </h2>
          <p className="mt-2">
            当社は、個人情報の漏洩、滅失、毀損の防止その他安全管理のために、適切な技術的・組織的措置を講じます。
            従業員に対する教育・啓発を行い、個人情報の適正な取扱いを徹底いたします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            6. 開示・訂正・削除請求
          </h2>
          <p className="mt-2">
            利用者は、当社が保有する自己の個人情報について、個人情報保護法に基づき、開示・訂正・追加・削除・利用停止を請求することができます。
            請求を希望される場合は、下記のお問い合わせ先までご連絡ください。本人確認のうえ、合理的な範囲で速やかに対応いたします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            7. お問い合わせ
          </h2>
          <p className="mt-2">
            個人情報の取扱いに関するお問い合わせは、以下の窓口までご連絡ください。
          </p>
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p>株式会社サンプル 個人情報管理責任者</p>
            <p className="mt-1">
              メール: privacy@example.com
            </p>
            <p>住所: 〒100-0001 東京都千代田区千代田1-1-1 サンプルビル3F</p>
          </div>
        </section>
      </div>
    </div>
  )
}
