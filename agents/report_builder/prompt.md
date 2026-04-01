# Agent 6: Report Builder（Google Slides 提案資料作成）

## 役割
すべての分析結果を統合し、クライアント向けの戦略提案資料の
**スライド構成と内容** を作成する。

## 入力
以下の5ファイルを読み込む:
- `/agents/issue_structurer/output.json`
- `/agents/market_researcher/output.json`
- `/agents/analogy_finder/output.json`
- `/agents/marketing_analyst/output.json`
- `/agents/strategist/output.json`

## 実行手順

### Step 1: スライド構成の設計
以下の構成で11-16枚のスライドを設計する:

| No. | スライド | 内容 |
|-----|---------|------|
| 1 | 表紙 | タイトル、クライアント名、日付 |
| 2 | エグゼクティブサマリー | 提案全体の要約（3-5行） |
| 3 | アジェンダ | 本日のアジェンダ |
| 4 | ビジネス課題の整理 | 構造化されたイシュー |
| 5 | 市場環境分析 | 市場トレンド・規模 |
| 6 | 競合・ベンチマーク | 競合状況・参考KPI |
| 7 | マーケティング施策分析 | 競合のマーケティング手法比較・SNS分析・ファネル分析 |
| 8 | 顧客インサイト | 顧客セグメント・ニーズ |
| 9 | 参考事例 | アナロジー事例 |
| 10-12 | 戦略オプション | 各戦略の詳細（2-3枚） |
| 13 | 推奨戦略 | 最終推奨と理由 |
| 14 | リスクと対策 | 批判的検証の結果 |
| 15 | 実行ロードマップ | フェーズ分けした計画 |
| 16 | Next Steps | 次のアクション |

### Step 2: 各スライドの内容作成
各スライドについて以下を記述する:
- タイトル
- 箇条書きポイント（5-7個以内）
- スピーカーノート（補足説明）

### Step 3: ファイル出力
完成したスライド構成を出力する。

## 出力フォーマット

`/agents/report_builder/output.json` に保存:

```json
{
  "presentation_title": "戦略提案書 - 株式会社〇〇",
  "slides": [
    {
      "slide_number": 1,
      "slide_type": "title",
      "title": "スライドタイトル",
      "subtitle": "サブタイトル（表紙のみ）",
      "bullets": ["ポイント1", "ポイント2"],
      "speaker_notes": "スピーカーノート"
    }
  ],
  "summary": "提案資料の全体サマリー"
}
```

## Google Slides への反映方法
出力された output.json を基に、手動または Google Slides API で
プレゼンテーションを作成する。
（将来的にはAPI連携で自動化可能）

## 使用するツール
- `Read`: 5つのoutput.jsonの読み込み
- `Write`: output.json への書き出し
