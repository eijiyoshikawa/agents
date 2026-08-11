import type { CompanyProfile } from "./types";

/**
 * 株式会社LET の自社プロフィール。
 *
 * アクセントは LETロゴの紺色。レイアウトは feer デザインシステム（和文B2Bデフォルト）に準拠。
 * 正式なロゴ・指定カラー・住所等が確定したら、この1ファイルを更新するだけで
 * 全求人票（Web/PDF）に反映される。
 */
export const LET_COMPANY: CompanyProfile = {
  name: "株式会社LET",
  nameEn: "LET inc.",
  tagline: "可能性を、解き放て。",
  about:
    "株式会社LETは、AIとクリエイティブの力でクライアントの事業成長を支援する会社です。",
  website: "https://let.co.jp",
  email: "recruit@let.co.jp",
  tel: "—",
  address: "—",
  brand: {
    ink: "#1a1a1a",
    cream: "#FFF9EF",
    accent: "#3a5a87", // LETロゴの紺
    accentDark: "#2c4768",
    surface: "#fcfbfa",
  },
};
