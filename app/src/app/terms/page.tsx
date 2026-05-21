import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "利用規約",
}

const sections = [
  {
    title: "第1条（適用範囲）",
    content:
      "本規約は、株式会社サンプル（以下「当社」といいます）が提供する求人情報サービス（以下「本サービス」といいます）の利用に関する条件を定めるものです。本サービスを利用するすべてのユーザー（以下「利用者」といいます）に適用されます。",
  },
  {
    title: "第2条（サービス内容）",
    content:
      "本サービスは、ドライバー・建設・製造業などノンデスク産業に特化した求人情報の提供を行います。当社は、本サービスの内容を利用者への事前通知なく変更できるものとし、利用者はこれを承諾するものとします。また、ハローワーク（公共職業安定所）に掲載されている求人情報を転載しています。",
  },
  {
    title: "第3条（利用登録）",
    content:
      "本サービスの一部機能を利用するためには、利用登録が必要です。利用者は、登録情報について正確かつ最新の情報を提供するものとし、虚偽の情報を登録してはなりません。登録情報に変更が生じた場合は、速やかに修正するものとします。",
  },
  {
    title: "第4条（禁止事項）",
    items: [
      "法令または公序良俗に違反する行為",
      "当社または第三者の知的財産権、肖像権、プライバシー、名誉その他の権利を侵害する行為",
      "本サービスの運営を妨害する行為",
      "他の利用者になりすます行為",
      "本サービスの情報を不正に収集・利用する行為（スクレイピング等）",
      "求人情報への虚偽の応募その他不正な利用",
      "反社会的勢力への利益供与その他の協力行為",
      "その他、当社が不適切と判断する行為",
    ],
  },
  {
    title: "第5条（免責事項）",
    content:
      "当社は、本サービスに掲載される求人情報の正確性、完全性、有用性等について保証するものではありません。ハローワークから転載した求人情報については、最新の状況と異なる場合があります。利用者が本サービスを利用したことにより生じた損害について、当社の故意または重大な過失がある場合を除き、当社は責任を負わないものとします。",
  },
  {
    title: "第6条（個人情報の取扱い）",
    content:
      "当社は、利用者の個人情報を別途定めるプライバシーポリシーに従い適切に取り扱います。利用者は、本サービスの利用にあたり、プライバシーポリシーに同意するものとします。",
  },
  {
    title: "第7条（準拠法・管轄裁判所）",
    content:
      "本規約の解釈にあたっては日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">利用規約</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2025年1月1日</p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
            {section.content && (
              <p className="mt-2 text-gray-700 leading-relaxed">
                {section.content}
              </p>
            )}
            {section.items && (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-gray-700">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
