export const hero = {
  tagline: "支援を仕組みに変え、地域を創る",
  subtitle: "ひらかた 子ども食堂 支援NPO",
  description:
    "枚方市の子ども食堂を、みんなで支える仕組みをつくります。",
  cta: "一緒にひらかたを育てませんか",
};

export const problem = {
  sectionTitle: "子ども食堂の現状と課題",
  stats: [
    { value: "約40", unit: "ヵ所", label: "枚方市の子ども食堂数" },
    { value: "+10", unit: "ヵ所", label: "2025年だけで増加" },
  ],
  issues: [
    {
      icon: "💰",
      title: "資金不足",
      description: "運営者の持ち出しで成立。自治体補助だけでは足りない。",
    },
    {
      icon: "👥",
      title: "人員不足",
      description: "運営者の高齢化、ボランティア・スタッフの慢性的不足。",
    },
    {
      icon: "⚠️",
      title: "持続性リスク",
      description: "費用負担や課題により、今後漸減する可能性。",
    },
  ],
  necessity: [
    "子供・親のコミュニティの場",
    "子供の第3の教育の場",
    "子供の居場所",
  ],
};

export const cityData = {
  sectionTitle: "枚方DATA",
  subtitle: "2025年最新",
  items: [
    { value: "392,328", unit: "人", label: "枚方市の全人口" },
    { value: "185,778", unit: "世帯", label: "世帯数" },
    { value: "59,000", unit: "人", label: "18歳以下の子供" },
    { value: "45", unit: "校", label: "小学校数" },
    { value: "22,320", unit: "戸", label: "空き家数" },
    { value: "31", unit: "ヵ所", label: "子ども食堂（市登録）" },
  ],
};

export const solution = {
  sectionTitle: "NPOの目的と解決策",
  goal: "1小学校区に5ヵ所以上の子ども食堂を",
  description:
    "既存・新規の子ども食堂が無理なく続けられるよう支援する活動を行います。",
  items: [
    {
      problem: "資金不足",
      solution: "チケット販売の補助・食材の寄付等で資金回りの支援",
    },
    {
      problem: "ボランティア不足",
      solution: "人員確保（大学との連携等）",
    },
    {
      problem: "食材の調達・保管",
      solution: "セントラル倉庫で協賛食材を集中管理し各食堂へ配送",
    },
  ],
  funding:
    "寄付金 + 事業収益 + ふるさと納税型クラウドファンディングで持続可能な資金調達",
};

export const benefits = {
  sectionTitle: "メリット・可能性",
  quote: "子ども食堂は「無限のポテンシャルを秘めたこれからのプラットフォーム」",
  items: [
    {
      icon: "📣",
      title: "宣伝媒体として",
      description:
        "企業のCSR活動、新製品モニタリング、飲食店の宣伝にも効果的。",
    },
    {
      icon: "🤝",
      title: "雇用・福祉支援",
      description:
        "就職雇用支援・障がい者支援・空き家問題解決にもつながる。",
    },
    {
      icon: "🔍",
      title: "社会課題の早期発見",
      description:
        "ネグレクト・DV・いじめ等の問題を早期に発見できる場。",
    },
    {
      icon: "🏘️",
      title: "地域経済への波及",
      description:
        "人がつながり地域経済が活性化。防犯・食事会等による地域づくり。",
    },
  ],
};

export const businessPlans = {
  sectionTitle: "事業紹介",
  kikurage: {
    title: "ひらかたキノコ — きくらげ栽培事業",
    reasons: [
      "省スペース・高収穫が見込める",
      "農薬不要で育てやすい",
      "初収穫が60〜90日と早い",
      "空き家や空き倉庫を活用（初期投資を抑制）",
    ],
    revenue: [
      { label: "年間売上", value: "約240万円", note: "40kg×年4回×1,500円/kg" },
      { label: "年間コスト", value: "約108万円", note: "月9万円×12ヶ月" },
      { label: "年間利益", value: "約132万円", note: "6畳1室ベース", highlight: true },
    ],
    initialCost: "約355万円",
    purposes: [
      "販売利益をNPO活動資金・雇用支援に",
      "ふるさと納税・CFの返礼品として提供",
      "障がい者・高齢者の栄養提供（スーパーフード）",
      "空き家・空地対策",
    ],
  },
  warehouse: {
    title: "セントラル倉庫 — 地域インフラ整備事業",
    description:
      "単なる福祉活動に留まらず、子ども食堂を起点とした「地域インフラ整備事業」を目指します。",
    features: [
      "大型冷蔵冷凍庫・食材仕分けスペース",
      "調理場・客席15席の飲食スペース併設",
      "30〜50坪の施設",
    ],
    costs: [
      { label: "内装費", value: "510万円" },
      { label: "設備費", value: "300万円" },
      { label: "什器・備品", value: "90万円" },
    ],
    totalCost: "900万円",
  },
};

export const funding = {
  sectionTitle: "資金調達戦略",
  grantsCount: "14種以上",
  grantsSubtitle: "の補助金・助成金を調査済み",
  topGrants: [
    {
      name: "WAM助成金（福祉医療機構）",
      amount: "数十万〜数千万円",
      target: "福祉・子ども・障害者等",
    },
    {
      name: "枚方市空き家活用補助制度",
      amount: "上限150〜350万円",
      target: "空き家改修工事費",
    },
    {
      name: "小規模事業者持続化補助金",
      amount: "上限50〜200万円",
      target: "設備導入・販路開拓",
    },
    {
      name: "枚方市NPO活動応援基金",
      amount: "—",
      target: "登録NPOへの補助",
    },
  ],
  furusatoCF: {
    title: "ふるさと納税型クラウドファンディング",
    description:
      "自治体が主体となり、特定事業・社会課題解決を目的として寄付を募集。寄付者は税控除を受けられる。",
    advantages: [
      "寄付者に税控除あり（支援者負担の軽減）",
      "事業目的に沿って非課税",
      "市との連携でNPOの信頼度UP",
    ],
  },
  strategy: [
    { step: "1", title: "実績づくり", description: "自治体・民間財団の小規模助成で実績を積む" },
    { step: "2", title: "モデル事業化", description: "WAM助成金・府市協働事業で事業化" },
    { step: "3", title: "大型補助金", description: "国の大型補助金へステップアップ" },
  ],
};

export const cta = {
  sectionTitle: "一緒にひらかたを育てませんか",
  description:
    "子ども食堂の支援を通じて、枚方の未来を一緒につくる仲間を募集しています。企画・営業・事務・外交など、あなたの得意を活かせる場所があります。",
  roles: [
    "企画・営業",
    "書類・申請関係",
    "広報・SNS運用",
    "役所・公的機関との連携",
    "ボランティア",
  ],
};

export const nav = {
  items: [
    { label: "現状", href: "#problem" },
    { label: "データ", href: "#citydata" },
    { label: "目的", href: "#solution" },
    { label: "メリット", href: "#benefits" },
    { label: "事業", href: "#business" },
    { label: "資金", href: "#funding" },
    { label: "参加", href: "#cta" },
  ],
};
