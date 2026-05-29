/**
 * 建設業界向けフリー素材カタログ
 *
 * 出典: Unsplash (https://unsplash.com)
 * ライセンス: Unsplash License — 商用利用可、クレジット表記不要
 *   https://unsplash.com/license
 *
 * 差し替え方法:
 *   1) Unsplash で好みの写真を検索
 *   2) URL の /photos/<slug-id> 部分をコピー（例: photo-1518709268805-4e9042af2176）
 *   3) このファイルの該当 entry を上書き
 *
 * 画像が表示されない場合:
 *   - 各テンプレの画像ラッパー div には bg-gradient が設定されており、
 *     画像が落ちてもレイアウトは崩れず代替表示されます。
 */

export type StockPhoto = {
  id: string;       // Unsplash photo ID (photo-xxx-yyy)
  alt: string;      // 日本語 alt テキスト
  category: string; // 用途カテゴリ
};

export const STOCK_PHOTOS = {
  // ヒーロー背景: ワイドな産業/建設シーン
  hero: {
    plant: { id: "photo-1518709268805-4e9042af2176", alt: "プラント設備", category: "hero" },
    welding: { id: "photo-1504307651254-35680f356dfd", alt: "溶接作業", category: "hero" },
    site: { id: "photo-1503387762-592deb58ef4e", alt: "建設現場", category: "hero" },
    construction: { id: "photo-1541888946425-d81bb19240f5", alt: "産業プラント", category: "hero" },
  },

  // 事業内容セクション: サービス種別ごとの写真
  service: {
    plant: { id: "photo-1518709268805-4e9042af2176", alt: "プラント工事", category: "service" },
    pipes: { id: "photo-1581094271901-8022df4466f9", alt: "配管工事", category: "service" },
    welding: { id: "photo-1504307651254-35680f356dfd", alt: "溶接工事", category: "service" },
    machinery: { id: "photo-1581092160562-40aa08e78837", alt: "機械器具設置", category: "service" },
    building: { id: "photo-1487958449943-2429e8be8625", alt: "建築", category: "service" },
    blueprint: { id: "photo-1503387762-592deb58ef4e", alt: "設計図", category: "service" },
  },

  // About / 会社紹介: チーム・建物・働く人
  about: {
    team: { id: "photo-1521791136064-7986c2920216", alt: "チーム", category: "about" },
    workers: { id: "photo-1504917595217-d4dc5ebe6122", alt: "作業員", category: "about" },
    handshake: { id: "photo-1521791136064-7986c2920216", alt: "握手", category: "about" },
    building: { id: "photo-1487958449943-2429e8be8625", alt: "建造物", category: "about" },
  },

  // 募集職種: 働く人のポートレート/職人風景
  jobs: {
    worker: { id: "photo-1504917595217-d4dc5ebe6122", alt: "現場作業員", category: "jobs" },
    welder: { id: "photo-1504307651254-35680f356dfd", alt: "溶接工", category: "jobs" },
    architect: { id: "photo-1497366216548-37526070297c", alt: "建築設計", category: "jobs" },
  },
} as const;

/**
 * Unsplash 画像URL生成（レスポンシブ用クエリ付き）
 */
export function getPhotoUrl(photo: StockPhoto, width = 1600): string {
  return `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=${width}&q=75`;
}

/**
 * 同上だが小さめ（サムネ用）
 */
export function getThumbUrl(photo: StockPhoto): string {
  return getPhotoUrl(photo, 800);
}

/**
 * 同上だが特大（ヒーロー用）
 */
export function getHeroUrl(photo: StockPhoto): string {
  return getPhotoUrl(photo, 1920);
}
