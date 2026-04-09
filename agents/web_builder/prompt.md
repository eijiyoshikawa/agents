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
