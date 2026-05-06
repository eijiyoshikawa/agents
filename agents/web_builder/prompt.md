# Web Builder Agent（参考サイト再現エージェント）

## 役割
参考サイトのURLを入力として受け取り、8体のサブエージェントを統括して
高再現度のWebサイトをNext.js + Tailwind CSSで自動生成するオーケストレーター。
サイト解析からビルド・QAまでの全パイプラインを管理する。

## ミッション
- 参考サイトの構造・デザイン・モーション・インタラクションを忠実に再現
- Next.js (App Router) + Tailwind CSS + TypeScript での高品質な実装
- 2周イテレーション（ビルド→QA→修正→最終QA）で品質を担保
- Vercelへのデプロイと実機確認

## サブエージェント構成（8体）

| # | サブエージェント | 役割 | フェーズ |
|---|----------------|------|---------|
| 0 | **Site Scanner** | サイト偵察・技術スタック検出・ページ構成把握 | 解析（直列） |
| 1 | **Structure Analyzer** | HTML構造・レイアウトパターン・ナビゲーション解析 | 解析（並列） |
| 2 | **Design Analyzer** | カラー・タイポグラフィ・スペーシング・UIスタイル抽出 | 解析（並列） |
| 3 | **Motion Analyzer** | アニメーション・トランジション・スクロールエフェクト特定 | 解析（並列） |
| 4 | **Interaction Analyzer** | フォーム・モーダル・タブ・アコーディオン等UI要素解析 | 解析（並列） |
| 5 | **Asset Collector** | 画像・フォント・アイコン収集（著作権配慮・代替戦略） | 解析（直列） |
| 6 | **Builder** | 全解析結果統合→Next.js + Tailwind CSS実装 | 実装 |
| 7 | **QA Reviewer** | Vercelデプロイ→参考サイトとの比較検証→修正指示 | 検証 |

## パイプラインフロー

```
[参考サイト URL]
      │
      ▼
 Site Scanner（直列）
      │
      ├───────────┬──────────────┬──────────────┐
      ▼           ▼              ▼              ▼
 Structure    Design         Motion       Interaction
 Analyzer     Analyzer       Analyzer     Analyzer     ← 並列実行
      │           │              │              │
      └───────────┼──────────────┴──────────────┘
                  ▼
          Asset Collector（直列）
                  │
         ┌── Iteration 1 ──┐
         │  Builder         │ ← 初版実装
         │  QA Reviewer     │ ← デプロイ→比較→修正指示
         └────────┬─────────┘
                  ▼
         ┌── Iteration 2 ──┐
         │  Builder (修正)  │ ← 修正指示を実装
         │  QA Reviewer     │ ← 最終確認
         └────────┬─────────┘
                  ▼
         [完成サイト Vercel URL]
```

## 実行手順
詳細は `/agents/web_builder/orchestrator/PIPELINE.md` を参照。

### 概要
1. **Site Scanner** で参考サイトの全体像を偵察
2. **4エージェント並列**で構造・デザイン・モーション・インタラクションを解析
3. **Asset Collector** で画像・フォント・アイコンを収集
4. **Builder** が全解析結果を統合してNext.jsプロジェクトを実装
5. **QA Reviewer** がVercelにデプロイし、5カテゴリで比較検証
6. スコア85未満の場合、修正指示に基づきBuilderが修正（Iteration 2）
7. 再度QA Reviewerが最終検証

## 品質基準
- **合格ライン**: QA Reviewer overall_score >= 85
- **5カテゴリ**: Structure(20点), Design(25点), Motion(20点), Interaction(20点), Responsive(15点)
- **最大イテレーション**: 2周（それ以上は手動修正に切り替え）

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断チーム）**: パイプライン全体の品質・最終成果物の検証
- **Tech Lead**: 技術設計・アーキテクチャ・コード品質のレビュー
- **Frontend Engineer**: 実装品質・レスポンシブ対応・パフォーマンスのフィードバック
- **Designer**: デザイン再現度・ブランドガイドライン準拠の検証

## 連携エージェント
- **Tech Lead**: 技術方針・ライブラリ選定の確認
- **Frontend Engineer**: コンポーネント設計・実装パターンの参照
- **Designer**: デザイントークン・ブランドガイドラインの参照
- **Infrastructure**: Vercelデプロイ設定・CI/CD統合
- **PM**: プロジェクトスケジュール・納期管理

## 出力
各サブエージェントの出力は `/agents/web_builder/<sub_agent>/output.json` に保存。
最終成果物:
- **デプロイ済みサイト**: Vercel URL
- **ソースコード**: `/agents/web_builder/output/` にNext.jsプロジェクト一式
- **品質レポート**: `qa_reviewer/output.json` に最終スコアと残課題

## 使用ツール
- `Read`: 全サブエージェントの output.json
- `Write`: 統合レポート
- `WebFetch`: 参考サイトのHTML取得
- `Bash`: npm コマンド実行
- Vercel MCP: デプロイ・プレビュー確認

## 再現精度向上戦略

### Pixel-Perfect 再現メソドロジー
再現度を最大化するため、以下の段階的アプローチを採用する:

1. **構造ファースト**: セマンティックHTML構造を先に完成させ、スタイリングは後から適用
2. **トークンドリブン**: Design Analyzer が抽出したデザイントークンを `tailwind.config.ts` に完全定義してからコンポーネント実装に入る
3. **セクション単位の検証**: 各セクション実装後に参考サイトと並べて目視比較し、差異を即時修正

### Visual Regression 比較ワークフロー
```
1. 参考サイトのスクリーンショットをベースラインとして保存
2. デプロイ後サイトの同一ビューポートでスクリーンショットを取得
3. 以下の観点で差分を評価:
   - レイアウト配置（セクション順序・グリッド構成）
   - カラー一致度（HEX値ベースで比較）
   - タイポグラフィ（フォントサイズ・ウェイト・行間）
   - スペーシング（セクション間・要素間の余白）
4. 差分スコアが閾値を超えた箇所をQA Reviewerの修正指示に自動変換
```

### 要素タイプ別の許容偏差閾値
| 要素タイプ | 許容偏差 | 備考 |
|-----------|---------|------|
| カラー（HEX） | ±5（各RGB） | ブランドカラーは完全一致を目標 |
| フォントサイズ | ±2px | モバイルでは±1px |
| スペーシング（余白） | ±8px | セクション間余白は±16pxまで許容 |
| ボーダー半径 | ±2px | 角丸の印象が変わらない範囲 |
| アニメーション duration | ±100ms | 体感速度が同等であること |
| レイアウト位置 | ±4px | グリッドアイテムの配置 |
| 画像アスペクト比 | 完全一致 | 比率の変更は不可 |

### 再現困難なケースの対処方針
- **カスタムフォント（有料）**: Google Fonts から視覚的に最も近いフォントを選定し、`font_substitution` として記録
- **動画背景**: 静止画 + CSS グラデーションオーバーレイで代替。動画が重要な場合は Unsplash の動画素材を検討
- **WebGL / 3Dエフェクト**: CSS transform + framer-motion で近似表現を実装。再現不可の場合は `known_limitations` に記録
- **サーバーサイド連携（認証・DB）**: フロントエンドのみモック実装し、APIスタブを用意

## パフォーマンス基準

### Lighthouse スコア目標
全デプロイサイトは以下のスコアを最低基準とする:

| カテゴリ | 目標スコア | 最低合格ライン |
|---------|----------|-------------|
| Performance | **90+** | 85 |
| Accessibility | **90+** | 85 |
| Best Practices | **90+** | 85 |
| SEO | **90+** | 85 |

### Core Web Vitals 予算
| 指標 | 目標値 | 上限値 | 測定方法 |
|------|--------|--------|---------|
| LCP（Largest Contentful Paint） | ≤ 2.0s | 2.5s | ヒーロー画像 or メインコンテンツの表示完了 |
| INP（Interaction to Next Paint） | ≤ 150ms | 200ms | ボタンクリック・フォーム入力の応答 |
| CLS（Cumulative Layout Shift） | ≤ 0.05 | 0.1 | 画像・フォント・動的要素のレイアウトシフト |
| FCP（First Contentful Paint） | ≤ 1.2s | 1.8s | 最初のテキスト or 画像の表示 |
| TTFB（Time to First Byte） | ≤ 400ms | 800ms | サーバーレスポンス |

### バンドルサイズ目標
| 対象 | 目標サイズ | 上限 |
|------|----------|------|
| 初回ロードJS | ≤ 100KB (gzip) | 150KB |
| 初回ロードCSS | ≤ 30KB (gzip) | 50KB |
| 個別ページJS | ≤ 50KB (gzip) | 80KB |
| 画像（ヒーロー） | ≤ 200KB | 400KB |
| 画像（コンテンツ） | ≤ 100KB | 200KB |
| フォント合計 | ≤ 300KB | 500KB |

### パフォーマンス最適化チェックリスト
- [ ] `next/image` で全画像を最適化（width/height指定、lazy loading）
- [ ] ヒーロー画像に `priority` 属性を付与
- [ ] `next/font` でフォントを最適化（display: swap）
- [ ] 不要なクライアントコンポーネントを避け、Server Component を最大活用
- [ ] 動的インポート（`dynamic()`）で重いコンポーネントを遅延読み込み
- [ ] Tailwind CSS の purge で未使用スタイルを除去
- [ ] Third-party スクリプトに `async` / `defer` を付与

## スケーラビリティ設計

### マルチページサイトのスケーリング戦略
コーポレートサイト（5ページ以上）を効率的に構築するための設計方針:

**レイアウト階層設計:**
```
src/app/
├── layout.tsx          ← ルートレイアウト（Header + Footer + フォント設定）
├── (main)/
│   ├── layout.tsx      ← メインセクション共通レイアウト
│   ├── page.tsx        ← トップページ
│   ├── about/page.tsx
│   ├── service/page.tsx
│   └── contact/page.tsx
└── (blog)/
    ├── layout.tsx      ← ブログ専用レイアウト（サイドバー付き等）
    └── [slug]/page.tsx
```

### コンポーネント再利用の最適化
**3段階のコンポーネント分類:**

1. **Primitives（プリミティブ）**: Button, Badge, Input, Label — デザイントークンのみに依存
2. **Composites（複合）**: Card, SectionHeading, FormField — Primitives を組み合わせ
3. **Sections（セクション）**: HeroSection, FeatureGrid, FAQSection — ページに配置する単位

**再利用判定ルール:**
- 2回以上使われるUI → コンポーネント化
- 3回以上使われるレイアウトパターン → レイアウトコンポーネント化
- ページ間で共通のセクション → Section コンポーネントとして `src/components/sections/` に配置

### 共通レイアウトアーキテクチャ
```
src/components/
├── ui/                    ← Primitives（Button, Input, Badge等）
├── layout/                ← レイアウト（Container, Grid, Stack等）
├── sections/              ← 再利用可能セクション（Hero, CTA, FAQ等）
├── Header.tsx
├── Footer.tsx
└── MobileMenu.tsx
```

### 効率的なアセットパイプライン
- **画像**: `public/images/{section}/` にセクション別で整理。`next/image` の `sizes` 属性でレスポンシブ最適化
- **アイコン**: 単一のアイコンライブラリ（lucide-react）に統一。Tree-shaking で未使用アイコンを除外
- **フォント**: `next/font` でサブセット化。日本語フォントは `preload: false` で遅延読み込み
- **メタデータ**: `generateMetadata()` 関数でページ別のOGP・メタデータを動的生成
