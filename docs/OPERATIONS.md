# 業務OS — 運用ルール（OPERATIONS）

命名規則・保存先・安全ゲート・日次/週次の運用手順を定める。
全エージェント・全 Skill はこのドキュメントに従う。2026-07-06 制定。

## 1. ファイル命名・保存ルール

### 保存先マップ

| 成果物 | 保存先 | 命名 |
|--------|--------|------|
| エージェント実行結果（最新） | `agents/<agent>/output.json` | 固定名（次回実行で上書きされる前提） |
| 案件アーカイブ | `agents/outputs/<案件slug>/<YYYY-MM-DD>/` | `<agent>_output.json`、資料は `report.*` |
| SNS 投稿バッチ | `agents/outputs/<クライアントslug>/sns/<YYYY-Www>/posts.md` | 週番号は `date +%G-W%V` |
| SNS ブリーフ | `agents/outputs/<クライアントslug>/sns/brief.md` | 固定名・更新は差分承認後 |
| 日次レポート | `daily_reports/YYYY-MM-DD.md` | 週次は `YYYY-MM-DD-weekly.md` |
| テンプレート | `shared/templates/*.md` | 用途がわかる英小文字スネークケース |
| 入札ウォッチ | `bids/YYYY-MM-DD.md` | |
| 学習ログ | `learnings/sessions/` / `learnings/instincts/` | learnings/README.md に従う |

### 命名規則

- **案件slug / クライアントslug**: 英小文字ケバブケース（例: `bsf-new-business`, `kyushu-sangyo-unyu`）。
  日本語フォルダ名は新規では使わない（既存の日本語フォルダはそのまま。リネームしない）
- **日付**: `YYYY-MM-DD`（ISO 8601）。週は `YYYY-Www`
- **ブランチ**: CLAUDE.md の Git ワークフロー規約に従う（`feature/` `fix/` 等）

## 2. 外部送信・危険操作の安全ゲート

以下は **どの Skill・エージェントであっても、ユーザーの明示承認なしに実行しない**:

| 分類 | 対象 | ルール |
|------|------|--------|
| 外部投稿 | SNS 実投稿・予約投稿、プレスリリース配信 | ドラフト作成まで。投稿は人間が行う |
| 外部書き込み | Notion ページ作成/更新、Slack 送信、メール送信、Google Drive 書き込み | 実行前に対象と内容を提示して承認を得る。メール/Slack は原則「下書きまで」 |
| 課金 | 広告出稿、有料 API、有料プランのデプロイ設定 | 必ず事前確認。金額見積を提示 |
| 破壊的操作 | ファイル削除、`git push --force`、既存 brief/レポートの上書き、DB 変更 | 差分提示 → 承認後。バックアップまたは git 管理下でのみ |
| 認証情報 | API キー・トークンの表示/コミット | 禁止。環境変数のみ。漏洩疑い時は即ローテーション |

### 外部送信前チェックリスト（送信系の承認を求める際に添付する）

- [ ] 宛先・公開範囲は正しいか（誤送信リスク）
- [ ] クライアント名・数値・固有名詞に他案件の情報が混入していないか
- [ ] 秘密情報・認証情報・内部パスが含まれていないか
- [ ] 法的リスク表現（誇大・断定）は Legal 観点を通したか
- [ ] 取り消せない操作か。取り消せない場合、承認者を明記したか

## 3. 日次・週次の運用手順

### 毎日（5〜10分）

1. `/daily-report` を実行 → 一次案を確認・修正して確定
2. Ops Cockpit を更新して状態確認: `python3 scripts/build-cockpit.py` → `ops-cockpit.html` をブラウザで開く
3. WARN/ERR があれば該当エージェントの output.json を差し戻し

### 毎週（30分）

1. `/daily-report weekly` を実行 → 週次レポート確定
2. 昇格候補インスティンクト（confidence ≥ 0.9）を承認/却下
3. `bash scripts/security-scan.sh` と `bash scripts/context-budget.sh` の結果を確認
4. `/sns-batch <クライアント>` で来週分の投稿バッチを制作

### 案件発生時

- 提案依頼 → `/run-pipeline <会議名>`
- SNS 新規クライアント → `shared/templates/sns_content_brief.md` からブリーフ作成 → `/sns-batch`
- Web/LP 新規 → CLAUDE.md「案件タイプ別デフォルト基準」に従い design baseline を焼き付け

## 4. Skill 一覧（この業務OSの入口）

| Skill | 用途 | 置き場所 |
|-------|------|---------|
| `/run-pipeline <会議名>` | 戦略提案パイプライン実行（QAゲート・アーカイブ込み） | `.claude/skills/run-pipeline/` |
| `/daily-report [weekly]` | 日次・週次レポート一次案生成 | `.claude/skills/daily-report/` |
| `/sns-batch <クライアント>` | SNS 週次投稿バッチ制作 | `.claude/skills/sns-batch/` |

補助スクリプト: `scripts/qa-gate.sh`（出力検証）/ `scripts/build-cockpit.py`（ダッシュボード生成）/
既存: `scripts/context-budget.sh` / `scripts/security-scan.sh` / `scripts/bid_collect.py`
