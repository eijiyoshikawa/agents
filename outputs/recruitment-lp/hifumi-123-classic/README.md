# Recruitment LP Template

採用専用LPテンプレート。1つのNext.jsプロジェクトで3つのデザイン（modern / classic / pop）を切り替え可能。

## トーン3パターン

| テンプレ | 想定業種 | 特徴 |
|---------|---------|------|
| `modern` | IT / SaaS / コンサル | ミニマル・余白多め・モノクロ+エメラルド |
| `classic` | 不動産 / 金融 / 老舗 | ネイビー+ゴールド・セリフ書体・王道採用LP |
| `pop` | 美容 / 飲食 / D2C | ピンク+イエロー・大胆タイポ・ニューブルータリズム |

## ローカル起動

```bash
npm install
npm run dev
# http://localhost:3000
```

## テンプレ切り替え
`data/company.json` の `template` フィールドを変更:

```json
{ "template": "modern" }  // or "classic" or "pop"
```

## データスキーマ
`lib/types.ts` を参照。最低限以下が必要:

- `company.name`（必須）
- `company.slug`（必須・英小文字スラッグ）
- `services`（最低1件）
- `jobs`（最低1件）

## 自動生成パイプライン
このテンプレートは `/agents/recruitment_lp_generator/` のエージェント群から呼び出されます。

```bash
bash scripts/generate-recruitment-lp.sh --url "https://example.com" --template auto
```

## フリー素材写真（建設業界）

各テンプレートには建設業界向けのフリー素材写真がプリセット済みです。

### 出典・ライセンス
- **Unsplash** （https://unsplash.com）
- **ライセンス**: Unsplash License（商用利用可・クレジット表記不要・改変可）
- 詳細: https://unsplash.com/license

### カタログ
`lib/stock-photos.ts` に集約。カテゴリ:

| カテゴリ | 用途 | 写真例 |
|---------|------|-------|
| `hero.*` | ヒーロー背景 | プラント設備 / 溶接 / 建設現場 / 産業プラント |
| `service.*` | 事業内容カード | プラント / 配管 / 溶接 / 機械据付 / 建築 / 設計図 |
| `about.*` | 会社紹介 | チーム / 作業員 / 握手 / 建造物 |
| `jobs.*` | 募集セクション | 現場作業員 / 溶接工 / 建築設計 |

### 各テンプレでの配置箇所

#### modern
- **Hero背景** (`STOCK_PHOTOS.hero.plant`) — opacity 15% で薄く敷く
- **Servicesカード**サムネ — 各サービスカード上部 (aspect 16:10)

#### classic
- **Hero背景** (`STOCK_PHOTOS.hero.site`) — ネイビーグラデーションで重ねる
- **Businessセクション**メインビジュアル — 各事業の左/右側 (aspect 4:3)

#### pop
- **Servicesカード**サムネ — ポップな黒枠で囲んで配置 (aspect 16:9)

### 差し替え方法

#### A) カタログ単位で差し替え
`lib/stock-photos.ts` の該当 entry の `id` を Unsplash 写真IDに変更:

```ts
// 例: hero.plant を別写真に
hero: {
  plant: { id: "photo-XXXXXXXXX-YYYYYYYYY", alt: "新しい写真の説明", category: "hero" },
  ...
}
```

Unsplash 写真IDの取得方法:
1. https://unsplash.com で写真検索
2. 写真ページのURL（例: `https://unsplash.com/photos/some-slug-abc123def456`）
3. 写真自体のURL: 右クリック → 「画像のリンクをコピー」 → `https://images.unsplash.com/photo-XXX-YYY?...`
4. `photo-XXX-YYY` の部分を `id` に設定

#### B) 自社撮影の写真に差し替え（本番運用向け）
1. 写真ファイルを `public/photos/` に配置（例: `public/photos/our-site.jpg`）
2. `lib/stock-photos.ts` の `getPhotoUrl` を以下のように変更:

```ts
export function getPhotoUrl(photo: StockPhoto, width = 1600): string {
  // ローカル写真を使う場合
  return `/photos/${photo.id}.jpg`;
  // または CMS / S3 / Cloudinary などのCDN URL
}
```

そして `STOCK_PHOTOS` の `id` 値をローカルファイル名（拡張子なし）に変更。

#### C) クライアント企業の現場写真を使う場合
- お客様から提供された写真を `public/photos/` に配置
- 必ず使用許諾を得てから掲載
- 顔写真を使う場合は肖像権の許諾も別途取得

### フォールバック挙動
画像URLが読み込めない場合でも、ラッパー div の CSS グラデーション（slate / navy 等）で
レイアウトは崩れません。

## デモ用途
応募フォームはダミーUIです。実際の送信処理は行われません。
本実装時は `components/common/ApplicationForm.tsx` に Resend / SendGrid / Notion 等の送信処理を追加してください。
