# SNS分析レポート 運用手順書（チーム共通・多クライアント対応）

誰でも・どのクライアントでも、同じ手順で月次の採用SNS分析レポート（Google Slides 15枚）を作る。
スクショ → 数値抽出(Claude) → 自動充填(Apps Script) → 検証(Claude) → 仕上げ。

---

## 0. 仕組みの全体像

```
[クライアント月次フォルダ(Drive)]            [共有Apps Scriptプロジェクト]
 ├─ スクショ各種                  ──①Claude──▶  report_data.json をフォルダへ
 ├─ extraction_master.json (生データ)                    │
 └─ report_data.json (充填データ) ◀────────────────────┘
                │
                ②Apps Script: generateReportForFolder('<folderId>')
                ▼
         複製テンプレに自動充填 → 完成デッキURL
                │
                ③Claude: PDF化して全15枚を検証 → ズレがあれば即修正
                ▼
         ④手作業仕上げ（コメント抜粋・グラフ/投稿スクショ貼付）
```

- **数値抽出・検証は Claude（Maxプラン内・追加API費 ¥0）**、**描画は Apps Script（無料）**。
- テンプレ・スクリプトは全クライアント共通。**変わるのはデータ(report_data.json)だけ**。

---

## 1. 初回セットアップ（管理者が1回だけ）

| # | 作業 | 補足 |
|---|------|------|
| 1 | マスターテンプレを用意 | 既存の `【テンプレ】分析レポート-マスターデータ`（ID `1EHHEVOZTm7GkrU111lU69Nz1x-cwsgMfpu1unaWzazA`）。レイアウトは触らない |
| 2 | Apps Scriptプロジェクトを作成 | `scripts/report-generator/Code.gs` を貼付。`appsscript.json` のスコープ反映。`TEMPLATE_ID` は設定済み |
| 3 | プロジェクトをメンバーに共有 | Apps Scriptの「共有」でチームを編集者に。テンプレ＆クライアントフォルダのDrive権限も付与 |
| 4 | 動作確認 | サンプルで `generateReportForFolder` を実行しデッキ生成を確認 |

> テンプレのレイアウトを変えた場合のみ、`Inspect.gs` を再実行して `deck_structure.json` を取得し、
> `Code.gs` の `TEXT_MAP`/`TABLE_MAP`/`IMAGE_MAP`/`REPLACE_MAP` の座標を更新する（開発担当）。

---

## 2. 毎月のレポート作成（メンバーの手順）

### Step 1. フォルダとスクショを用意
Drive にこの構造で配置（**フォルダ名・スクショ名は固定**）:
```
（クライアント名）/（YYYY年MM提出分）/
  ├─ アカウント概要.png
  ├─ 概要_7日間.png / _28日間.png / _60日間.png / _365日間.png
  ├─ オーディエンス_7日間.png / _28日間.png / _60日間.png / _365日間.png
  └─ 投稿別インサイト/  （投稿01本目.png … 投稿NN本目.png）
```

### Step 2. Claude に数値抽出を依頼（Claude Code）
対象フォルダのIDを添えて、以下を貼る（**{{ }}を置換**）:
```
Drive フォルダ {{月次フォルダID}} の採用SNS分析レポートを作ります。
1. フォルダ内の全スクショ（概要4期間・オーディエンス4期間・投稿別インサイト全件）を
   OCR×ビジョンで抽出し、extraction_master.json を同フォルダに作成。
2. scripts/report-generator/build_report_data.py で report_data.json を生成し、
   同フォルダにアップロード。
   引数: --client {{クライアント名}} --ym {{YYYY年MM月}} --data-date {{取得日}}
        --account-name {{アカウント名}} --handle {{@ハンドル}} --period {{運用期間}}
3. ナラティブ（【要レビュー】箇所）をデータに基づき具体化。
不明値は空欄、推定値は入れないこと。
```
→ Claude が `extraction_master.json` と `report_data.json` をフォルダに書き込む。

### Step 3. Apps Script で生成（メンバー）
共有Apps Scriptプロジェクトを開き、関数 `generateReportForFolder` を実行。
引数に月次フォルダIDを渡す（下記のように一時関数を作って実行が簡単）:
```javascript
function run() { generateReportForFolder('{{月次フォルダID}}'); }
```
→ 実行ログに **「生成完了: https://docs.google.com/presentation/d/.../edit」**。

### Step 4. Claude に検証を依頼
```
生成デッキ {{デッキURL}} を検証して。PDF化して全15枚の充填漏れ・位置ズレ・数値取り違えを確認し、
あればCode.gs/データを修正して再生成手順を提示して。
```

### Step 5. 手作業で仕上げ
- slide10-12「コメントピックアップ」に実コメントを追記
- グラフ画像・各投稿スクショを該当位置へ貼付（テンプレに画像枠が無いため手貼り）

---

## 3. 多クライアント運用のポイント
- テンプレ・スクリプトは共通。**フォルダとデータを差し替えるだけ**。
- デッキ名は `report_data.json` の `meta.deck_title`（`{client}_{ym}_分析レポート`）で自動命名。
- クライアント別の運用目的・ターゲットは `report_data.json` の `summary`/`next_actions` で調整。

---

## 4. データ契約（report_data.json）
| ブロック | 主キー | 反映先 |
|---|---|---|
| meta | report_ym / author / created / deck_title | slide1 |
| summary | basic_info / goal / result | slide4 |
| account | header / followers_start / followers_now / followers_change / posts_total / post_freq / video_views(_pct) / pf_access(_pct) / likes(_pct) / comments / comments_pct / shares(_pct) | slide6 |
| posts | header_monthly / header_popular / monthly_table / popular_table1-3 | slide8 / slide9 |
| highlighted_posts[] | header / eval / comment | slide10-12 |
| next_actions | reflection / current_issue / next_action / current_issue2 / next_action2 | slide14 / slide15 |
| images | cover / summary（任意・Drive ID or 公開URL） | slide1 / slide4 |

ルール:
- 数値は文字列。`%`はテンプレ固定表示があるため**数字のみ**（例 `"+139.21"`）。
- **未取得はキー省略**でテンプレ初期値を維持。空文字 `""` は空欄上書きになるので注意。
- 表はテンプレ既存セルを左上から上書き。行/列超過分は無視。

---

## 5. トラブルシュート
| 症状 | 原因/対処 |
|---|---|
| 実行ログに `未検出(text/table) slideX @l,t` | その座標にシェイプが無い＝テンプレ変更の可能性。`Inspect.gs`で座標再取得 |
| `generateReportFromDataFile is not defined` | コードの貼り付け漏れ。`Code.gs`を**全文**貼り直す |
| `report_data.json が見つかりません` | フォルダ直下にファイル名 `report_data.json` で置く |
| デッキの表が空に見える（テキスト確認時） | テキスト抽出は表セル非対応。**PDF化して確認**（Claudeが実施） |
| `000`/`00`/`〇〇` が残る | 該当キーがデータに無い。`report_data.json`に値を追加 |

---

## 6. コスト
1本あたり実質 **約¥2,500（人作業45分・追加API/ツール費¥0）**、従来手作業比 **70〜75%削減**。
詳細は `COST_ESTIMATE.md`。

---

## 関連ファイル
- `Code.gs` … レンダラ（位置ベース・全クライアント共通）
- `Inspect.gs` … テンプレ構造ダンパ（レイアウト変更時のみ）
- `build_report_data.py` … 抽出マスター→report_data 変換（CLI・再利用可）
- `schema/report_data.schema.json` … データ契約
- `samples/REVECAREERAGENCY_2026-06.*` … 実例（extraction_master / report_data）
