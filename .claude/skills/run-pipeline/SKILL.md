---
name: "run-pipeline"
description: "戦略提案パイプライン（Notion議事録→リサーチ→戦略→提案資料）をワンコマンドで実行する。「パイプラインを実行」「提案資料を作って」「/run-pipeline 会議名」で起動。orchestrator/run.md のコピペ実行を置き換える。"
---

あなたは COO Agent としてこのパイプラインの進行管理を行う。

## 引数

`/run-pipeline <会議名> [--from <ステップ番号>] [--local-only]`

- `<会議名>`: Notion 議事録のページ名（必須。無ければユーザーに確認する）
- `--from N`: ステップ N から再開。N より前のステップは既存の output.json を再利用する
- `--local-only`: Google Slides 作成（ステップ6）をスキップし、構成案の Markdown 出力まで

## プリフライト（実行前チェック）

1. `agents/orchestrator/PIPELINE.md` を読み、最新のステップ定義を確認する
2. Notion MCP が使えるか確認（ToolSearch で `notion-search` を検索）。使えなければ
   ユーザーに議事録テキストの貼り付けを依頼して Retriever ステップの入力とする
3. `--from` 指定時は、それ以前のステップの output.json に対して
   `bash scripts/qa-gate.sh <agent名>...` を実行し、再利用可能か検証する

## 実行手順

各ステップで `/agents/<agent名>/prompt.md` を読み、指示に従って
`/agents/<agent名>/output.json` を生成する。

1. **retriever** — Notion で「<会議名>」を検索・取得し構造化
2. **issue_structurer** — ビジネス課題の構造化
3. **market_researcher / analogy_finder / marketing_analyst** — 3体を**並列**で実行
   （Agent ツールで同時起動。それぞれ WebSearch を使用）
4. **strategist** — リサーチ統合・戦略オプション構築。完了後、devils_advocate の
   prompt.md に従い批判的検証を実施し、指摘を strategist の output.json に反映
5. **report_builder** — スライド構成設計（PIPELINE.md の Step 6 のデータ仕様に従う）
6. **Google Slides 作成** — 外部書き込みのため**必ずユーザーに実行可否を確認**する。
   `--local-only` 時・拒否時は、スライド構成を `agents/outputs/<案件slug>/<日付>/slides_outline.md` に出力

## QA ゲート（各ステップ完了後に必ず実行）

```bash
bash scripts/qa-gate.sh <agent名>
```

- **ERR**（JSON パース不能・欠落）→ そのステップを修正して再実行。次に進まない
- **WARN**（トークン予算超過など）→ output.json を要点のみに圧縮してから次へ
- 内容面は各エージェント prompt.md の「相互干渉」セクションに従い、
  後続エージェントが前工程の妥当性を1〜2行で評価してから作業に入る

## アーカイブ(必須・最終ステップ)

output.json は次回パイプラインで上書きされるため、完了時に必ず保存する:

```bash
mkdir -p agents/outputs/<案件slug>/<YYYY-MM-DD>
cp agents/{retriever,issue_structurer,market_researcher,analogy_finder,marketing_analyst,strategist,report_builder}/output.json \
   agents/outputs/<案件slug>/<YYYY-MM-DD>/  # 各ファイルは <agent名>_output.json にリネーム
```

案件slug は英小文字ケバブケース（例: `bsf-new-business`）。docs/OPERATIONS.md の命名規則に従う。

## 完了報告

以下を報告して終了する:
- 各ステップの状態（OK / WARN内容 / スキップ理由）
- 戦略オプションの要約（3行以内）
- アーカイブ先パス
- 人間の次アクション(スライド確認・クライアント送付判断など)

## 禁止事項

- Notion への書き込み・Slack/メール送信は、ユーザーの明示承認なしに行わない
- ステップの完了を偽装しない。失敗はそのまま報告する
