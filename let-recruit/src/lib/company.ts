import type { CompanyProfile } from "./types";

/**
 * 株式会社LET の自社プロフィール。
 *
 * アクセントは LETロゴの紺色。レイアウトは feer デザインシステム（和文B2Bデフォルト）に準拠。
 * 正式なロゴ・指定カラー・住所等が確定したら、この1ファイルを更新するだけで
 * 全求人票（Web/PDF）に反映される。
 */
export const LET_COMPANY: CompanyProfile = {
<<<<<<< HEAD
  name: "株式会社LET - 求人票様式",
  nameEn: "株式会社LET - 求人票様式",
  tagline: "日本の基盤に、新たな成長エンジンを。",
  about:
    "株式会社LETは、AIとクリエイティブの力でクライアントの事業成長を支援する会社です。",
  website: "https://www.let-inc.net/",
  email: "eiji.yoshikawa@let-inc.net",
  tel: "—",
  address: "—",
  agency: {
    name: "株式会社LET",
    address: "大阪府大阪市中央区南久宝寺町4丁目4-12 IB CENTERビル 8F",
    licenseNumber: "—",
  },
=======
  name: "株式会社LET",
  nameEn: "LET inc.",
  tagline: "可能性を、解き放て。",
  about:
    "株式会社LETは、AIとクリエイティブの力でクライアントの事業成長を支援する会社です。",
  website: "https://let.co.jp",
  email: "recruit@let.co.jp",
  tel: "—",
  address: "—",
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
  brand: {
    ink: "#1a1a1a",
    cream: "#FFF9EF",
    accent: "#3a5a87", // LETロゴの紺
    accentDark: "#2c4768",
    surface: "#fcfbfa",
  },
};
