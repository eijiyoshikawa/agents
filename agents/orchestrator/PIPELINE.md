# パイプライン実行手順書

## 概要
会議の議事録から戦略提案資料を自動生成する6段階パイプライン。
Claude Code 上で順番に実行する。

## 前提条件
- Claude Code（Max プラン）で実行
- 以下の MCP サーバーが接続済みであること:
  - **Notion** — 議事録の取得に使用
  - **Google Slides（Google Drive MCP）** — 過去資料の検索・スライド作成に使用

## パイプライン全体像

```
[Notion 議事録]
      │
      ▼
┌─────────────┐
│ 1. Retriever │  ← Notion MCP で議事録を取得・構造化
└─────┬───────┘
      ▼
┌──────────────────┐
│ 2. Issue Structurer │  ← ビジネス課題を言語化・検索クエリ生成
└─────┬────────────┘
      ├──────────────────┐
      ▼                  ▼
┌──────────────┐  ┌───────────────┐
│ 3. Market    │  │ 4. Analogy    │  ← 並列実行
│   Researcher │  │    Finder     │
└──────┬───────┘  └───────┬───────┘
       └────────┬─────────┘
                ▼
┌─────────────────┐
│ 5. Strategist   │  ← 戦略構築 + Devil's Advocate
└─────┬───────────┘
      ▼
┌─────────────────┐
│ 6. Report Builder│  ← スライド構成を生成
└─────────────────┘
      │
      ▼
[Google Slides 提案資料]
```

## 実行手順

### Step 0: 準備
会議名（Notion の議事録ページ名）を確認する。
以下の手順では `{{会議名}}` を実際の会議名に置き換えること。

---

### Step 1: Retriever（議事録取得・構造化）
**プロンプト:** `/agents/retriever/prompt.md`
**出力:** `/agents/retriever/output.json`

1. `notion-search` で `{{会議名}}` を検索
2. 該当ページを `notion-fetch` で取得
3. 議事録を構造化し `output.json` に保存

**完了条件:** `retriever/output.json` に `title`, `key_points`, `raw_text` が含まれている

---

### Step 2: Issue Structurer（課題の言語化）
**プロンプト:** `/agents/issue_structurer/prompt.md`
**入力:** `/agents/retriever/output.json`
**出力:** `/agents/issue_structurer/output.json`

1. `retriever/output.json` を読み込む
2. ビジネス課題を構造化
3. リサーチクエリを 5-10 個生成
4. `output.json` に保存

**完了条件:** `core_question` と `research_queries` が含まれている

---

### Step 3 & 4: Market Researcher + Analogy Finder（並列実行）
**並列で 2 つのエージェントを同時実行する。**

#### 3. Market Researcher
**プロンプト:** `/agents/market_researcher/prompt.md`
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/market_researcher/output.json`

- `research_queries` を使って WebSearch を実行
- 市場・競合・ベンチマーク・顧客情報を収集

#### 4. Analogy Finder
**プロンプト:** `/agents/analogy_finder/prompt.md`
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/analogy_finder/output.json`

- 異業種のアナロジー事例を 5-8 件収集
- 転用可能なインサイトを抽出

**完了条件:** 両方の `output.json` が保存されている

---

### Step 5: Strategist（戦略構築 + 批判的検証）
**プロンプト:** `/agents/strategist/prompt.md`
**入力:** `issue_structurer`, `market_researcher`, `analogy_finder` の output.json
**出力:** `/agents/strategist/output.json`

1. 全リサーチ結果を統合
2. 戦略オプションを 3-5 個構築
3. Devil's Advocate で批判的検証
4. 最終推奨戦略を選定

**完了条件:** `recommended_strategy` と `critical_reviews` が含まれている

---

### Step 6: Report Builder（提案資料の構成作成）
**プロンプト:** `/agents/report_builder/prompt.md`
**入力:** `issue_structurer`, `market_researcher`, `analogy_finder`, `strategist` の output.json
**出力:** `/agents/report_builder/output.json`

1. 10-15 枚のスライド構成を設計
2. 各スライドのタイトル・箇条書き・スピーカーノートを作成
3. `output.json` に保存

**完了条件:** `slides` 配列に 10-15 個のスライドオブジェクトがあり、各スライドに `title`, `bullets`, `speaker_notes` が含まれている

#### 情報フロー図

```
issue_structurer/output.json ──┐
                               │
market_researcher/output.json ─┼──→ Report Builder ──→ report_builder/output.json
                               │     (prompt.md)        ├─ presentation_title
analogy_finder/output.json ────┤                         ├─ slides[] (10-15枚)
                               │                         │   ├─ title
strategist/output.json ────────┘                         │   ├─ bullets[]
                                                         │   └─ speaker_notes
                                                         └─ summary
```

#### 入力データ仕様

| ソースファイル | 使用する主要フィールド |
|---|---|
| `issue_structurer/output.json` | `client_name`, `industry`, `core_question`, `issues[]`（各 issue の `title`, `description`, `category`, `priority`） |
| `market_researcher/output.json` | `insights[]`（各 insight の `category`, `title`, `summary`, `source`, `relevance`）、`customer_segments`, `competitive_landscape` |
| `analogy_finder/output.json` | `cases[]`（各 case の `source_industry`, `company_or_case`, `summary`, `transferable_insight`, `source`） |
| `strategist/output.json` | `recommended_strategy`, `options[]`（各 option の `name`, `description`, `pros`, `cons`, `feasibility`, `expected_impact`）、`critical_reviews`, `redefined_issues` |

#### データソース → スライド対応マッピング

| No. | スライド | 主なデータソース |
|-----|---------|-----------------|
| 1 | 表紙 | `issue_structurer` → `client_name`, `industry` |
| 2 | エグゼクティブサマリー | `strategist` → `recommended_strategy` |
| 3 | アジェンダ | スライド構成から自動生成 |
| 4 | ビジネス課題の整理 | `issue_structurer` → `core_question`, `issues[]` |
| 5 | 市場環境分析 | `market_researcher` → `insights[]`（category=market） |
| 6 | 競合・ベンチマーク | `market_researcher` → `insights[]`（category=benchmark/competitor）、`competitive_landscape` |
| 7 | 顧客インサイト | `market_researcher` → `insights[]`（category=customer）、`customer_segments` |
| 8 | 参考事例 | `analogy_finder` → `cases[]` |
| 9-11 | 戦略オプション | `strategist` → `options[]` |
| 12 | 推奨戦略 | `strategist` → `recommended_strategy`, `redefined_issues` |
| 13 | リスクと対策 | `strategist` → `critical_reviews` |
| 14 | 実行ロードマップ | `strategist` → `options[推奨].expected_impact` |
| 15 | Next Steps | 全ソースから統合 |

#### 単独実行（パイプライン途中からの呼び出し）

上流ステップが完了済みで output.json が揃っている場合、Report Builder だけを呼び出せる:

```
以下の4ファイルを読み込み、/agents/report_builder/prompt.md の指示に従って
10-15枚のスライド構成を作成し、/agents/report_builder/output.json に保存してください。

入力:
- /agents/issue_structurer/output.json
- /agents/market_researcher/output.json
- /agents/analogy_finder/output.json
- /agents/strategist/output.json
```

**事前確認:** 4つの入力ファイルが全て存在し、各ファイルの主要フィールド（上記テーブル参照）が含まれていること。

---

### Step 7: Google Slides への反映（オプション）
`report_builder/output.json` の内容を Google Slides MCP で実際のプレゼンテーションに変換する。

1. `createGoogleSlides` で新しいプレゼンテーションを作成
2. 各スライドを `createGoogleSlidesTextBox` で追加
3. スピーカーノートを `updateGoogleSlidesSpeakerNotes` で設定

---

## エラー時の対応

| 問題 | 対応 |
|------|------|
| Notion で議事録が見つからない | ページ名を確認し再検索。部分一致でも試す |
| WebSearch の結果が不十分 | クエリを変更して再実行 |
| output.json のフォーマット不正 | prompt.md の出力フォーマットに従って修正 |
| MCP サーバー未接続 | Claude Code の MCP 設定を確認 |

## 共有・再利用

このパイプラインを他の人が使う場合:

1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバー（Notion, Google Drive）を設定する
4. 下記のコマンドで実行:

```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「会議名」からパイプラインを実行してください。
```

または、`/agents/orchestrator/run.md` のプロンプトを使って一括実行できる。
