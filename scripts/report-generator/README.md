# SNS分析レポート 自動生成レンダラ

クライアントSNS運用スクショ → Google Slides 分析レポートを半自動生成する仕組み。
パイプライン全体は `/agents/orchestrator/REPORT_PIPELINE.md` を参照。

## 構成
```
scripts/report-generator/
├── Code.gs                          # Apps Script レンダラ（位置ベース流し込み）
├── Inspect.gs                       # ワンタイム調査: デッキ構造を deck_structure.json に出力
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
| 生成後の品質検証 | Claude | Drive MCP でデッキ読取→未充填/位置ズレ検出 |

## 方式: トークン化不要・位置ベース
元テンプレ（`【テンプレ】分析レポート`）は `0,000` `テキスト` 等が重複するため、
従来は `{{TOKEN}}` への手作業置換が必要だった。本版では **シェイプの位置(left,top)で
特定して直接当て込む** ため、**マスターのトークン化は不要**。位置マップは
`Inspect.gs` が出力する `deck_structure.json` を基に `Code.gs` 内へ確定済み。

> マスターのレイアウトを変更した場合は、`Inspect.gs` を再実行して新しい
> `deck_structure.json` を取得し、`Code.gs` の `TEXT_MAP` / `TABLE_MAP` /
> `IMAGE_MAP` / `REPLACE_MAP` の座標を更新すること。

## ワンタイム設定（初回のみ）
1. https://script.google.com で新規プロジェクト作成
2. `Code.gs` を貼り付け、`appsscript.json` のスコープを反映
3. `Code.gs` 冒頭の `TEMPLATE_ID` にマスターのIDを設定（設定済み）
4. 初回実行で Drive / Slides 権限を承認

> 旧方式の `{{TOKEN}}` 置換（`TOKENIZATION_GUIDE.md`）は本版では不要。参考用に残置。

## 実行
- **フォルダ指定**: `generateReportForFolder('<提出分フォルダID>')`
  （対象フォルダに `report_data.json` を置いておく）
- **データファイル指定**: `generateReportFromDataFile('<report_data.jsonのファイルID>')`
- **メニュー**: バインド先を開き「レポート生成 > フォルダIDを指定して生成」

実行後、ログに生成デッキのURLが出力される。

## データ契約（report_data.json）
トップレベル: `meta` / `summary` / `account` / `posts` / `highlighted_posts` / `next_actions` / `images`

| ブロック | 主キー | 流し込み先 |
|---------|-------|-----------|
| `meta` | `report_ym`(表紙日付), `author`, `created`, `deck_title` | slide1 |
| `summary` | `basic_info`(改行可), `goal`, `result` | slide4 |
| `account` | `header`, `followers_now`, `followers_change`, `video_views`(_pct), `pf_access`(_pct), `likes`(_pct), `comments`(_pct), `shares`(_pct), `posts_total`, `post_freq` | slide6 |
| `posts` | `monthly_table`(2次元), `popular_table1/2/3`(2次元) | slide8 / slide9 |
| `highlighted_posts[]` | `header`, `eval`, `comment` | slide10-12 |
| `next_actions` | `reflection`, `current_issue`, `next_action`, `current_issue2`, `next_action2` | slide14 / slide15 |
| `images` | `cover`, `summary`（Drive ID or 公開URL／任意） | slide1 / slide4 |

ルール:
- 数値は文字列（カンマ可）。`%`はテンプレ側に固定表示があるため**数字のみ**渡す（例: `"+139.21"`）。
- **未取得項目はキー自体を省略** → テンプレ既定の placeholder を維持する。
  空文字 `""` を渡すと placeholder が空欄に上書きされる点に注意。
- 表はテンプレ既存セルを左上から上書き。テンプレの行/列を超える分は無視。

## 既知の制約 / 今後
- slide6 のグラフ画像・各投稿スクショは **テンプレに画像枠が無い**ため自動配置対象外（手貼り）。
- 画像枠があるのは slide1(表紙) / slide4(総括) のみ。`images` で差替可。
- 月次集計テーブル(slide8)は集計スクショ未提供時は省略（テンプレ表を維持）。
- 一覧管理先のNotion連携はフェーズ2。
