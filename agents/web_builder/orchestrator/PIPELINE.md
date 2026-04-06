# Web Builder パイプライン実行手順書

## 概要
参考サイトのURLから高再現度のWebサイトを自動生成する8エージェント + 2周イテレーションパイプライン。
Claude Code 上で順番に実行する。

## 前提条件
- Claude Code（Max プラン）で実行
- 以下の MCP サーバーが接続済みであること:
  - **Vercel** — デプロイ・実機確認に使用
- Node.js 18+ がインストール済み

## パイプライン全体像

```
[参考サイト URL]
      │
      ▼
┌──────────────────┐
│ 0. Site Scanner  │  ← 技術検出・ページ構成把握
└─────┬────────────┘
      │
      ├─────────────┬──────────────┬──────────────┐
      ▼             ▼              ▼              ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐
│1. Structure│ │2. Design  │ │3. Motion  │ │4. Interaction│  ← 並列実行
│  Analyzer │ │  Analyzer │ │  Analyzer │ │   Analyzer   │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └──────┬───────┘
      └───────┬─────┘              │               │
              ▼                    │               │
        ┌──────────────┐           │               │
        │5. Asset      │           │               │
        │   Collector  │           │               │
        └──────┬───────┘           │               │
               └──────────┬────────┴───────────────┘
                          ▼
              ┌──── Iteration 1 ────┐
              │  6. Builder         │  ← 全結果統合して初版実装
              │  7. QA Reviewer     │  ← デプロイ → 比較 → 修正指示
              └──────────┬──────────┘
                         ▼
              ┌──── Iteration 2 ────┐
              │  6. Builder (修正)   │  ← 修正指示を実装
              │  7. QA Reviewer     │  ← 再デプロイ → 最終確認
              └──────────┬──────────┘
                         ▼
              [完成サイト Vercel URL]
```

## 実行手順

### Step 0: 準備
参考サイトの URL を確認する。
以下の手順では `{{参考URL}}` を実際のURLに置き換えること。
複数ページサイトの場合はトップページURLを指定する。

---

### Step 1: Site Scanner（サイト偵察）
**プロンプト:** `/agents/web_builder/site_scanner/prompt.md`
**出力:** `/agents/web_builder/site_scanner/output.json`

1. `WebFetch` で `{{参考URL}}` のトップページを取得
2. 技術スタック・ページ一覧・外部ライブラリを検出
3. `output.json` に保存

**完了条件:** `site_type`, `pages`, `tech_stack` が含まれている

---

### Step 2〜5: 4エージェント並列解析

**並列で 4 つのエージェントを同時実行する。**

#### 2. Structure Analyzer（構造解析）
**プロンプト:** `/agents/web_builder/structure_analyzer/prompt.md`
**入力:** `/agents/web_builder/site_scanner/output.json`
**出力:** `/agents/web_builder/structure_analyzer/output.json`

- 各ページのセクション構成・レイアウト・ナビゲーション・フッターを解析

#### 3. Design Analyzer（デザイン解析）
**プロンプト:** `/agents/web_builder/design_analyzer/prompt.md`
**入力:** `/agents/web_builder/site_scanner/output.json`
**出力:** `/agents/web_builder/design_analyzer/output.json`

- カラーパレット・タイポグラフィ・スペーシング・UIコンポーネントスタイルを抽出

#### 4. Motion Analyzer（モーション解析）
**プロンプト:** `/agents/web_builder/motion_analyzer/prompt.md`
**入力:** `/agents/web_builder/site_scanner/output.json`
**出力:** `/agents/web_builder/motion_analyzer/output.json`

- アニメーション・トランジション・スクロールエフェクトを特定

#### 5. Interaction Analyzer（インタラクション解析）
**プロンプト:** `/agents/web_builder/interaction_analyzer/prompt.md`
**入力:** `/agents/web_builder/site_scanner/output.json`
**出力:** `/agents/web_builder/interaction_analyzer/output.json`

- フォーム・モーダル・タブ・アコーディオン・スライダー等を解析

**完了条件:** 4つの `output.json` が全て保存されている

---

### Step 6: Asset Collector（アセット収集）
**プロンプト:** `/agents/web_builder/asset_collector/prompt.md`
**入力:** `site_scanner/output.json` + `design_analyzer/output.json`
**出力:** `/agents/web_builder/asset_collector/output.json`

1. 画像・フォント・アイコンのURL収集
2. 代替アセット（プレースホルダー）の戦略決定
3. ローカルファイルパスの設計

**完了条件:** `images`, `fonts`, `icons` が含まれている

---

### Step 7: Builder — Iteration 1（初版実装）
**プロンプト:** `/agents/web_builder/builder/prompt.md`
**入力:** Agent 0〜5 の全 output.json
**出力:** `/agents/web_builder/output/`（Next.js プロジェクト）+ `builder/output.json`

1. Next.js プロジェクト初期化
2. Tailwind CSS 設定
3. 共通コンポーネント実装
4. 各ページ・セクション実装
5. モーション実装
6. インタラクティブ要素実装
7. レスポンシブ対応
8. `npm run build` で確認

**完了条件:** `npm run build` が成功し、`builder/output.json` に `build_status: "success"` が含まれている

---

### Step 8: QA Reviewer — Iteration 1（初回検証）
**プロンプト:** `/agents/web_builder/qa_reviewer/prompt.md`
**入力:** `builder/output.json` + 全解析結果 + 参考サイトHTML
**出力:** `/agents/web_builder/qa_reviewer/iteration_1.json`

1. Vercel にデプロイ
2. 5カテゴリで比較検証（Structure, Design, Motion, Interaction, Responsive）
3. スコアリング + 修正指示生成

**完了条件:** `iteration_1.json` に `overall_score` と `fix_instructions` が含まれている

---

### Step 9: Builder — Iteration 2（修正実装）
**プロンプト:** `/agents/web_builder/builder/prompt.md`
**入力:** 全 output.json + `qa_reviewer/iteration_1.json`
**出力:** 修正されたプロジェクト + 更新された `builder/output.json`

1. `iteration_1.json` の `fix_instructions` を priority 順に対応
2. high → medium → low の順に修正
3. `npm run build` で確認

**完了条件:** `npm run build` が成功

---

### Step 10: QA Reviewer — Iteration 2（最終検証）
**プロンプト:** `/agents/web_builder/qa_reviewer/prompt.md`
**入力:** 更新された `builder/output.json` + 全解析結果
**出力:** `/agents/web_builder/qa_reviewer/iteration_2.json` + `qa_reviewer/output.json`

1. Vercel に再デプロイ
2. 再度5カテゴリで比較検証
3. 最終スコア + 残課題レポート

**完了条件:** `iteration_2.json` と `output.json`（最終サマリー）が保存されている

---

## エラー時の対応

| 問題 | 対応 |
|------|------|
| WebFetch でページが取得できない | URLを確認。JavaScript レンダリングが必要なSPAの場合はその旨を記録 |
| npm run build でエラー | エラーメッセージを読み、TypeScript/JSX のエラーを修正 |
| Vercel デプロイ失敗 | ビルドログを確認し、依存関係やNode.jsバージョンの問題を解決 |
| 外部ライブラリの検出漏れ | 参考サイトを手動確認し、site_scanner/output.json を修正 |
| スコアが低い（< 60） | fix_instructions の high 項目に集中して対応 |

## 完了時の成果物

1. **デプロイ済みサイト**: Vercel URL（プレビュー確認可能）
2. **ソースコード**: `/agents/web_builder/output/` に Next.js プロジェクト一式
3. **品質レポート**: `qa_reviewer/output.json` に最終スコアと残課題
4. **解析データ**: 各エージェントの `output.json`（再利用可能）
