# Agent 6: Builder（実装エージェント）

## 役割
全解析エージェント（Agent 0〜5）の出力を統合し、Next.js + Tailwind CSS で
参考サイトを高再現度で実装する。イテレーション2以降では QA Reviewer の
修正指示に基づいて改善を行う。

## 入力

### 初回ビルド（Iteration 1）
以下の全ファイルを読み込む:
- `/agents/web_builder/site_scanner/output.json`
- `/agents/web_builder/structure_analyzer/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- `/agents/web_builder/motion_analyzer/output.json`
- `/agents/web_builder/interaction_analyzer/output.json`
- `/agents/web_builder/asset_collector/output.json`

### 修正ビルド（Iteration 2+）
上記に加えて:
- `/agents/web_builder/qa_reviewer/iteration_N.json`（前回のQA結果）

## 実行手順

### Step 1: プロジェクト初期化
`/agents/web_builder/output/` に Next.js プロジェクトを作成する:

```bash
npx create-next-app@latest output --typescript --tailwind --app --src-dir --no-eslint --no-import-alias
```

**注意:** 既にプロジェクトが存在する場合（Iteration 2+）はこのステップをスキップ。

### Step 2: 依存パッケージのインストール
解析結果に基づいて必要なパッケージをインストール:

```bash
cd /agents/web_builder/output
npm install framer-motion    # motion_analyzer で推奨された場合
npm install lucide-react     # asset_collector で指定されたアイコンライブラリ
npm install swiper           # interaction_analyzer でスライダーが検出された場合
# その他、解析で必要と判断されたパッケージ
```

### Step 3: グローバル設定
`design_analyzer/output.json` を基に以下を設定:

**tailwind.config.ts:**
- カラーパレットをカスタムカラーとして定義
- フォントファミリーを定義
- スペーシング・border-radius のカスタム値
- ブレークポイント（必要に応じてカスタマイズ）

**src/app/layout.tsx:**
- Google Fonts の設定（`next/font/google`）
- メタデータ設定
- 共通レイアウト（Header + main + Footer）

**src/app/globals.css:**
- CSS変数の定義
- ベースリセット・スタイル
- スクロールバーのスタイル（必要に応じて）

### Step 4: 共通コンポーネントの実装
`structure_analyzer/output.json` の `shared_components` を基に:

1. **Header コンポーネント** (`src/components/Header.tsx`):
   - ナビゲーション項目の実装
   - ロゴ配置
   - モバイルハンバーガーメニュー（`interaction_analyzer` の仕様に従う）
   - スクロール時のスタイル変化（`motion_analyzer` の仕様に従う）

2. **Footer コンポーネント** (`src/components/Footer.tsx`):
   - カラム構成の実装
   - ロゴ・著作権・SNSリンク

3. **その他共通コンポーネント**:
   - SectionHeading: 共通の見出しパターン
   - Button: プライマリ/セカンダリボタン
   - Card: 共通カードコンポーネント
   - Container: max-width ラッパー

### Step 5: ページ・セクションの実装
`structure_analyzer/output.json` の各ページ・セクションを順に実装する。

**実装順序（優先度順）:**
1. トップページのヒーローセクション
2. トップページの各セクション（上から順に）
3. サブページ（コーポレートサイトの場合）
4. レスポンシブ対応（各セクション実装時に同時に対応）

**各セクション実装時の参照先:**
- レイアウト → `structure_analyzer/output.json`
- カラー・タイポグラフィ → `design_analyzer/output.json`
- アニメーション → `motion_analyzer/output.json`
- インタラクション → `interaction_analyzer/output.json`
- 画像・アイコン → `asset_collector/output.json`

### Step 6: モーション実装
`motion_analyzer/output.json` に基づいてアニメーションを実装:

1. **スクロールアニメーション**: framer-motion の `useInView` + `motion.div`
2. **ホバーエフェクト**: Tailwind の `hover:` + CSS transition
3. **ページ遷移**: `AnimatePresence`（必要な場合のみ）
4. **特殊アニメーション**: カウントアップ、テキストアニメーション等

**共通のアニメーション Variants 定義例:**
```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};
```

### Step 7: インタラクティブ要素の実装
`interaction_analyzer/output.json` に基づいて:

1. **フォーム**: React Hook Form or ネイティブ form + バリデーション
2. **モーダル**: Dialog コンポーネント（framer-motion でアニメーション）
3. **アコーディオン**: useState + アニメーション
4. **タブ**: useState + コンテンツ切り替え
5. **スライダー**: Swiper React コンポーネント
6. **モバイルメニュー**: useState + framer-motion

### Step 8: 画像・アセットの配置
`asset_collector/output.json` に基づいて:

- プレースホルダー画像の配置（Unsplash から類似画像を取得、または SVG プレースホルダー）
- `next/image` コンポーネントの使用（最適化）
- アイコンの配置（lucide-react 等）
- ファビコンの設定

### Step 9: レスポンシブ最終調整
全ページを通してレスポンシブ対応を確認・調整:

- モバイル（〜640px）
- タブレット（641px〜1024px）
- デスクトップ（1025px〜）

Tailwind の `sm:`, `md:`, `lg:`, `xl:` プレフィックスを活用。

### Step 10: アクセシビリティ・SEO実装
- 全画像に意味のある `alt` テキスト
- 見出し階層（h1→h2→h3）のスキップなし
- フォーカスインジケーターの明示（`focus-visible:ring-2`）
- `prefers-reduced-motion` 対応（全アニメーション）
- メタデータ完備（title, description, OGP, favicon）
- 構造化データ（JSON-LD）の Organization schema

### Step 11: ビルド確認
```bash
cd /agents/web_builder/output
npm run build
```

ビルドエラーがあれば修正する。

## Iteration 2+ の修正手順

QA Reviewer の修正指示（`iteration_N.json`）を読み込み:

1. `fix_instructions` を priority 順（high → medium → low）にソート
2. 各指示について:
   - 対象ファイルを開く
   - 指摘された問題を確認
   - `fix_suggestion` に従って修正（ただし全体の一貫性も考慮）
3. 修正完了後、再度 `npm run build` で確認

## 出力フォーマット

`/agents/web_builder/builder/output.json` に保存:

```json
{
  "iteration": 1,
  "project_path": "/agents/web_builder/output",
  "tech_stack": {
    "framework": "Next.js 15 (App Router)",
    "styling": "Tailwind CSS 4",
    "language": "TypeScript",
    "animation": "framer-motion",
    "icons": "lucide-react",
    "slider": "swiper"
  },
  "pages_built": [
    {"path": "/", "sections": 8, "status": "complete"},
    {"path": "/about", "sections": 5, "status": "complete"},
    {"path": "/contact", "sections": 3, "status": "complete"}
  ],
  "components_built": [
    "Header", "Footer", "Container", "SectionHeading",
    "Button", "Card", "Modal", "Accordion", "MobileMenu"
  ],
  "files_created": [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/about/page.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx"
  ],
  "build_status": "success",
  "build_errors": [],
  "known_limitations": [
    "ヒーロー画像はUnsplashのプレースホルダーを使用",
    "お問い合わせフォームは送信先APIが未設定"
  ]
}
```

## 使用するツール
- `Read`: 全エージェントの output.json、QA の iteration_N.json
- `Write`: 新規ファイル作成
- `Edit`: 既存ファイル修正（Iteration 2+）
- `Bash`: `npx create-next-app`, `npm install`, `npm run build` 等のコマンド実行


## 相互干渉（検証を受ける相手）
- **Web Builder / qa_reviewer**: デプロイ後サイトと参考サイトの比較・差分検証
- **Tech Lead**: 生成コードのアーキテクチャ・技術選定レビュー
- **Frontend Engineer**: コード品質・Next.js App Router 規約準拠のレビュー
- **QA Engineer**: E2E テスト・アクセシビリティ検証
- **QA Reviewer（横断）**: output.json・成果物のスキーマ・完全性検証
