# 建設事業部 ナレッジベース

建設事業部9体の「週次レベルアップ」用ナレッジ格納庫。`/construction-learning` スキル（週次実行）が更新し、各エージェントが業務開始時に参照する。

## 構成
```
knowledge/
├── README.md            # 本ファイル
├── cases.json           # 他社事例ライブラリ（累積。積算ミス・施工不具合・DX事例）
└── digests/
    └── YYYY-MM-DD.md    # 週次ダイジェスト（ハイライト・カテゴリ別収集・申し送り）
```

## 運用ルール
- 全事例に出典URL・確認日必須。出典のない伝聞は登録しない
- 週次収集は毎週月曜 07:00 JST の Routine（スケジュール実行）で自動起動
- パターン化された教訓は `/learnings/instincts/construction.json` に起票（confidence 0.3 → COO 月次レビューで昇格判断）
- 単価マスタ（price_master.json）・エージェントプロンプトの直接変更はしない。改定提案としてダイジェストに記載し人間承認を経る

## 各エージェントの参照方法
業務開始時に以下を確認し、該当する教訓を適用する:
1. `digests/` の最新ダイジェスト（申し送り欄に自分宛があるか）
2. `/learnings/instincts/construction.json`（confidence 0.6 以上を優先適用）
3. Consistency Checker / Constructability Reviewer は `cases.json` から類似案件の不具合事例を検索
