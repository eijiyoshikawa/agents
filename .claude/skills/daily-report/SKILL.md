---
name: "daily-report"
description: "日次レポート（daily_reports/YYYY-MM-DD.md）または週次レポートの一次案を自動生成する。「日報を作って」「今日のレポート」「/daily-report」「/daily-report weekly」で起動。集計はスクリプトで機械化し、AIは組織診断と改善計画の一次案に集中する。"
---

あなたは CEO/COO Agent として組織の日次・週次レポートを作成する。
生成物は**一次案**であり、最終判断は人間が行う前提で書く。

## 引数

`/daily-report [weekly] [<日付 YYYY-MM-DD>]`

- 引数なし: 今日の日次レポートを `daily_reports/YYYY-MM-DD.md` に生成
- `weekly`: 直近7日分の日次レポートを統合した週次レポートを
  `daily_reports/YYYY-MM-DD-weekly.md` に生成

## データ収集（必ずスクリプトで機械集計する）

```bash
date +%F                                   # 今日の日付
ls daily_reports/*.md | tail -5            # 前回レポートの特定
git log --oneline --since="<前回レポート日>" # 期間中の変更
bash scripts/qa-gate.sh --all --json       # 全エージェント出力の品質状態
bash scripts/context-budget.sh --json      # コンテキスト予算監査
ls -lt agents/*/output.json | head -10     # 出力の鮮度（どのエージェントが最近稼働したか)
ls learnings/instincts/ 2>/dev/null        # インスティンクト蓄積状況
```

エージェント総数・上限・残り枠は CLAUDE.md の「エージェント構成」を正とする。

## 日次レポートの構成

`shared/templates/daily_report.md` をベースに、過去レポート
（例: `daily_reports/2026-04-28.md`）と同じ見出し構造・表形式を踏襲する:

1. **位置付け** — 今日の変更・活動の1〜2行サマリー
2. **組織サマリー** — 総エージェント数 / 上限 / 残り枠（CLAUDE.md 基準）
3. **本日の変更内容** — git log とファイル差分から事実ベースで記述
4. **品質・予算の状態** — qa-gate / context-budget の結果を表で。WARN/ERR は対応方針を併記
5. **組織診断** — チェック&バランス健全性。前回レポートの数値と比較
6. **改善計画（一次案）** — 優先度付き3件以内。「要人間判断」のラベルを必ず付ける

## 週次モード（weekly）の追加内容

- 直近7日の日次レポートを読み、週のハイライト・数値トレンドを統合
- `learnings/instincts/` の確信度レビュー状況を確認し、
  昇格候補（confidence ≥ 0.9）があれば列挙（昇格の実施自体は人間承認後）
- 来週の重点3項目を提案

## ルール

- 事実(スクリプト出力・git log)と推測(診断・提案)を明確に分ける。
  推測には「（一次案・要確認）」を付ける
- 既存レポートと同じ日付のファイルがある場合は上書きせず、
  差分を提示してユーザーに確認する
- レポート生成後、冒頭サマリーと WARN/ERR 件数、要人間判断の項目をチャットで報告する
- 外部送信(Slack/メール等)はしない。ローカル保存まで
