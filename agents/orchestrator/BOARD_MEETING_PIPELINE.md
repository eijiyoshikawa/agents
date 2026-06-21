# 役員会議 議事録 → タスク化パイプライン手順書

## 概要
役員会議が終わるたびに Notion の議事録を投入し、
**決定事項・アクションアイテムを構造化 → タスクとして要約 → 必要なものは実際に作業まで実行**する 5 段階パイプライン。
会議ごとに専用の作業ブランチを切り、議事録の決定をそのまま実装・成果物に落とし込めるようにする。

## トリガー（ユーザーの使い方）
役員会議が終わったら、以下のいずれかでパイプラインを起動する。

```
役員会議の議事録です。タスク化して必要なら作業まで進めてください。

<ここに Notion の議事録本文を貼り付け、または Notion ページ名を指定>
```

- **議事録本文を貼り付け** → そのままパースして処理
- **Notion ページ名を指定** → Notion MCP（`notion-search` / `notion-fetch`）で取得して処理

## 前提条件
- Claude Code（Max プラン）で実行
- 議事録を Notion から取得する場合は **Notion MCP** が接続済みであること
- 実装・作業を伴う場合は、対象に応じて開発部門エージェント（Tech Lead / Frontend / Backend / Infrastructure / Engineer 等）を起動

## パイプライン全体像

```
[役員会議 議事録（貼り付け or Notion ページ）]
            │
            ▼
┌────────────────────────┐
│ 1. 議事録取得・正規化         │  ← 本文を取り込み、ノイズ除去・構造化
└──────────┬─────────────┘
            ▼
┌────────────────────────┐
│ 2. 決定事項・タスク抽出        │  ← 決定 / アクション / 論点 / 保留 に分類
└──────────┬─────────────┘
            ▼
┌────────────────────────┐
│ 3. タスク要約・トリアージ      │  ← 担当エージェント・優先度・期限・作業要否を付与
└──────────┬─────────────┘
            ▼
┌──────────┴─────────────┐
│ 4. 作業ブランチ作成 + 実行     │  ← 「要作業」タスクのみ担当エージェントへ振り分け
└──────────┬─────────────┘
            ▼
┌────────────────────────┐
│ 5. サマリー報告 + 議事録への記録 │  ← タスク表を出力、必要なら Notion / コミットに反映
└────────────────────────┘
```

---

## 実行手順

### Step 1: 議事録取得・正規化
**出力:** `board_meetings/<YYYY-MM-DD>/minutes.json`

1. 議事録本文が貼り付けられていればそれを使用。Notion ページ名のみ指定された場合は `notion-search` → `notion-fetch` で取得。
2. 日付・会議名・出席者・アジェンダを抽出。
3. 本文を発言/論点単位に正規化し、`raw_text` として保持。

**完了条件:** `minutes.json` に `meeting_date`, `meeting_title`, `attendees`, `raw_text` が含まれている。

---

### Step 2: 決定事項・タスク抽出
**入力:** `board_meetings/<YYYY-MM-DD>/minutes.json`
**出力:** `board_meetings/<YYYY-MM-DD>/tasks.json`

議事録を以下の 4 区分に分類して抽出する。

| 区分 | 内容 |
|------|------|
| `decisions` | 確定した経営判断・方針（作業ではなく記録対象） |
| `action_items` | 誰かが手を動かす必要があるタスク |
| `open_questions` | 結論が出ず継続検討となった論点 |
| `parked` | 保留・次回以降に持ち越し |

各 `action_items` には最低限 `title` と `description` を付ける。

**完了条件:** `tasks.json` に上記 4 配列が存在し、`action_items` が抽出されている。

---

### Step 3: タスク要約・トリアージ
**入力:** `board_meetings/<YYYY-MM-DD>/tasks.json`
**出力:** 同ファイルを更新（各 action_item にメタデータを付与）

各 `action_items` に以下を付与する。

| フィールド | 説明 |
|-----------|------|
| `owner_agent` | 担当エージェント（例: `finance`, `sales`, `tech_lead`, `engineer`, `legal` …）。CLAUDE.md の組織図に従う |
| `priority` | `high` / `medium` / `low` |
| `due` | 期限（議事録に明記が無ければ `null` または推定 + `estimated: true`） |
| `work_required` | `true` = このセッションで作業まで実行 / `false` = 記録・依頼のみ |
| `work_type` | `implementation` / `research` / `document` / `communication` / `decision` / `none` |
| `dependencies` | 他タスク・他エージェントへの依存（あれば） |

**トリアージ基準（`work_required = true` の目安）:**
- 実装・修正・資料作成など、成果物がこのリポジトリ内で完結するもの
- 期限が近い（high priority）かつ着手に追加情報が不要なもの

**`work_required = false` の例:** 対外交渉・人事面談・外部発注・次回会議までの情報待ちなど、人間や外部判断が必要なもの。

**完了条件:** 全 `action_items` に `owner_agent`, `priority`, `work_required`, `work_type` が付与されている。

---

### Step 4: 作業ブランチ作成 + 実行
**入力:** `board_meetings/<YYYY-MM-DD>/tasks.json`（`work_required = true` のタスク）

1. **作業ブランチを作成**（会議ごとに 1 本）:
   ```
   board/<YYYY-MM-DD>-<会議スラッグ>
   ```
   例: `board/2026-06-21-q2-review`
2. `work_required = true` のタスクを `owner_agent` ごとにグルーピングし、各担当エージェントの `prompt.md` に従って実行。
   - 開発系（`implementation`）は CLAUDE.md の「開発標準」「セキュリティ基準」に準拠（TDD / 関数50行 / シークレット禁止 等）。
   - 独立して実行可能なタスクは並列実行。
3. 各タスク完了ごとに Conventional Commits 規約でコミット:
   ```
   feat(board): <タスク要約>    # 役員会議 <YYYY-MM-DD> 起票
   ```
4. 重要意思決定を伴う実装は **Devil's Advocate** と **QA Reviewer** の検証を通す。

**作業を伴わない会議の場合:** Step 4 をスキップし、タスク表の記録のみ行う（専用ブランチは作成しない）。

**完了条件:** `work_required = true` の全タスクが「実行済み / 着手不可（理由付き）」のいずれかに確定している。

---

### Step 5: サマリー報告 + 記録
**出力:** `board_meetings/<YYYY-MM-DD>/summary.md`

1. タスク一覧表（担当 / 優先度 / 期限 / ステータス / 作業要否）を Markdown で出力。
2. このセッションで実行した作業（コミット / 成果物）を列挙。
3. `work_required = false` のタスクは「要フォロー」として明示し、担当へのハンドオフ文を添える。
4. 必要に応じて、`mcp__Notion__notion-update-page` で議事録ページにタスク表を追記、または COO / 各担当へ通知。

**ユーザーへの報告形式（チャット返信）:**
```
## 役員会議 <YYYY-MM-DD> タスク化結果
- 抽出タスク: N 件（うち要作業 M 件）
- このセッションで完了: X 件（ブランチ: board/...）
- 要フォロー（人手必要）: Y 件
[タスク表]
```

---

## ディレクトリ構成

```
board_meetings/
├── README.md                    # 運用ルール
├── _TEMPLATE/                   # 新規会議用テンプレート
│   ├── minutes.json
│   ├── tasks.json
│   └── summary.md
└── <YYYY-MM-DD>/                # 会議ごと
    ├── minutes.json             # Step 1 出力
    ├── tasks.json               # Step 2-3 出力
    └── summary.md               # Step 5 出力
```

## ブランチ運用

| 状況 | ブランチ |
|------|---------|
| 議事録のタスク化・記録のみ | 既定の作業ブランチにコミット（新規ブランチ不要） |
| 実装・成果物を伴う作業あり | 会議ごとに `board/<YYYY-MM-DD>-<会議スラッグ>` を作成 |

作業ブランチは完了後、PR を作成するか（ユーザー指示時のみ）、レビュー後にマージする。

## エラー時の対応

| 問題 | 対応 |
|------|------|
| 議事録から決定/タスクが読み取れない | ユーザーに不足箇所を確認。最低限「決定事項」と「ToDo」を尋ねる |
| 担当エージェントが特定できない | CLAUDE.md の組織図・連携表で最も近い部門に割り当て、`owner_agent_confidence: low` を付与 |
| 作業がリポジトリ外（外部発注等） | `work_required = false` とし、ハンドオフ文のみ作成 |
| Notion 未接続 | 議事録本文の貼り付けを依頼 |

## 関連
- 戦略提案パイプライン: `/agents/orchestrator/PIPELINE.md`
- 補助金申請パイプライン: `/agents/orchestrator/SUBSIDY_PIPELINE.md`
- ワンショット実行プロンプト: `/agents/orchestrator/board_meeting_run.md`
