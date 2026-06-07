# SNS分析レポート 自動生成レンダラ

クライアントSNS運用スクショ → Google Slides 分析レポートを半自動生成する仕組み。
パイプライン全体は `/agents/orchestrator/REPORT_PIPELINE.md` を参照。

## 構成
```
scripts/report-generator/
├── Code.gs                          # Apps Script レンダラ（描画担当）
├── appsscript.json                  # Apps Script マニフェスト（権限/タイムゾーン）
├── schema/report_data.schema.json   # データ契約（Claude抽出 ⇄ レンダラ消費）
├── samples/REVECAREERAGENCY_2026-06.report_data.json  # 実フォルダからの抽出例
└── README.md
```

## 役割分担
| 工程 | 担当 | ツール |
|------|------|--------|
| 画像→数値抽出 | Claude (Data Analyst) | Google Drive MCP（OCR×ビジョン） |
| `report_data.json` 生成 | Claude | MCP `create_file` でフォルダへ書込 |
| テンプレ複製＋流し込み | Apps Script | SlidesApp / DriveApp |
| 一覧追記 | Claude (Notion) | Notion MCP（方針確定後） |

## ワンタイム設定（初回のみ）

### 1. トークン化マスターテンプレを作る
元テンプレ（`【テンプレ】分析レポート`）は `0,000` や `テキスト` が重複しており、
`replaceAllText` が誤爆します。**1度だけ**、テンプレを複製して各プレースホルダを
`{{TOKEN}}` 形式へ置き換えた「マスターテンプレ」を用意してください。
👉 全15枚ぶんの正確な置換マップは **`TOKENIZATION_GUIDE.md`** を参照（機械的に作業できます）。
作業後は Claude が MCP でトークンの抜け漏れを検証できます。

### 2. Apps Script プロジェクトを作成
1. https://script.google.com で新規プロジェクト作成（またはマスターテンプレにバインド）
2. `Code.gs` の内容を貼り付け、`appsscript.json` のスコープを反映
3. `Code.gs` 冒頭の `TEMPLATE_ID` にマスターテンプレのIDを設定
4. 初回実行で Drive / Slides 権限を承認

> clasp を使う場合: `clasp push` でこのフォルダごと反映できます（`.clasp.json` は各自で）。

## 実行
- **メニューから**: バインド先を開き「レポート生成 > フォルダIDを指定して生成」
- **直接**: エディタで `generateReportForFolder('<提出分フォルダID>')` を実行
- 事前に対象フォルダへ `report_data.json` を置いておくこと（Claudeが生成）

## データ契約のポイント
- 数値は文字列（カンマ区切り可）。**不明値は空文字 `""`、推定値は入れない**
- `dashboard_images` / `highlighted_posts[].image_file_id` は Drive ファイルID
- スキーマ詳細は `schema/report_data.schema.json`

## 既知の制約 / 今後
- グラフは現状ダッシュボードのスクショ画像を貼る方式（数値はテーブルで再現）。
  ネイティブグラフ描画（Sheets連携）はフェーズ2。
- 月次集計テーブル(slide8)は専用の集計スクショ or 手入力が必要。
- 一覧管理先のNotion DBは未確定（新規 or 既存ハブ配下）。確定後に Step6 を実装。
