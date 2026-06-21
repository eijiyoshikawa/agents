# 役員会議 議事録・タスク管理

役員会議が終わるごとに、議事録をタスク化して保存する領域。
処理フローは `/agents/orchestrator/BOARD_MEETING_PIPELINE.md` を参照。

## 使い方
1. 役員会議が終わったら、`/agents/orchestrator/board_meeting_run.md` のプロンプトに議事録を貼って実行。
2. 会議ごとに `board_meetings/<YYYY-MM-DD>/` が作られ、以下が保存される:
   - `minutes.json` — 正規化した議事録
   - `tasks.json` — 抽出・トリアージしたタスク
   - `summary.md` — タスク表とこのセッションでの実行結果
3. 実装・成果物を伴うタスクがある場合は `board/<YYYY-MM-DD>-<会議スラッグ>` ブランチで作業する。

## ディレクトリ
```
board_meetings/
├── README.md          # このファイル
├── _TEMPLATE/         # 新規会議のひな型（コピーして使う）
└── <YYYY-MM-DD>/      # 会議ごとの成果物
```

## ステータス凡例（tasks.json / summary.md 共通）
| status | 意味 |
|--------|------|
| `todo` | 未着手 |
| `in_progress` | 着手中 |
| `done` | このセッションで完了 |
| `handoff` | 人手・外部対応が必要（要フォロー） |
| `blocked` | 依存待ち・情報不足で着手不可 |
