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

### 1.5 Web App化（推奨・フォルダURLを貼るだけの実行ページ）
Apps Scriptエディタを開かずに、**ブラウザのフォームにフォルダURLを貼って実行**できるページを公開する。
コード編集が不要になるため、チームの誰でもレポート生成を実行できる。

| # | 作業 | 補足 |
|---|------|------|
| 1 | `WebApp.gs` を既存プロジェクトに追加 | ファイル → スクリプト。`Code.gs` と同居させる |
| 2 | `WebAppUi.html` を追加 | ファイル → HTML。**ファイル名は `WebAppUi` 固定**（拡張子なしで入力） |
| 3 | デプロイ → 新しいデプロイ → 種類「ウェブアプリ」 | 説明は任意（例: レポート生成 v1） |
| 4 | **実行ユーザー: アクセスしているユーザー**（推奨） | 各自のDrive権限で動く＝フォルダ権限がそのままアクセス制御になる |
| 5 | アクセスできるユーザー: **Googleアカウントを持つ全員** | 権限の無い人はフォルダを開けないため実行不可 |
| 6 | 発行された `…/exec` URLをチームに共有 | 各自、初回アクセス時にGoogleの権限承認が1回必要 |

- 使い方: ページを開く → 提出分フォルダのURLを貼る → 「レポートを生成する」→ 完成デッキのリンクが表示される。
- `Code.gs` を更新したら「デプロイを管理 → 編集 → 新バージョン」で反映（URLは変わらない）。
- ⚠️ 「実行ユーザー: 自分」で公開すると、URLを知る全員が**管理者の権限で**生成できてしまうため非推奨。

### オプション: 完全自動化（ウォッチャー）
`Watcher.gs` を同じプロジェクトに同居させると、**フォルダに `report_data.json` を置くだけ**で
デッキが自動生成される（手動実行が不要になる）。
1. `Watcher.gs` を貼付し、`WATCH_ROOT_IDS` にクライアント群の親フォルダIDを設定
2. `installWatcher()` を一度実行（5分毎トリガー作成）
3. 以降、配下に `report_data.json` が現れると自動生成し、`.report_generated`（完了マーカー＋デッキURL）を残す
- **再生成**したいときは対象フォルダの `.report_generated` を削除する
- 運用フローが「Driveフォルダに `report_data.json` を置く（=Claudeが置く）→ 数分後にデッキ完成」になる

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

### Step 2.5. 自動QAチェック（Claude または手元のPython）
```bash
python3 scripts/report-generator/qa_check.py path/to/report_data.json
```
- `❌ ERROR` … 生成に進む前に必ず修正（必須メタ欠落・表の列数不一致・数値解釈不能）
- `⚠️ 要確認` … 元スクショと突合（@ハンドル未設定・累計投稿数が空・桁誤読/符号反転の疑い）
- `📝 TODO` … 提出前の手作業リスト（コメントピックアップ等）。生成はそのまま進めてよい
- 終了コード: ERROR=2 / 要確認のみ=1 / 全通過=0（CI・スクリプト連携用。`--json` でJSON出力）

### Step 3. 生成を実行（メンバー）
**方法A（推奨・Web App）**: 共有された生成ページ（`…/exec` URL）を開き、
月次フォルダのURLを貼って「レポートを生成する」を押す → 完成デッキのリンクが表示される。

**方法B（Apps Scriptエディタ）**: プロジェクトを開き `generateReportForFolder` を実行。
引数に月次フォルダIDを渡す（一時関数を作って実行が簡単）:
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
- 仕上げ後にもう一度 `qa_check.py` を通し、`要確認` と `TODO` が解消されたことを確認

### Step 6. Notion一覧DBへ記録（承認後）
```bash
python3 scripts/report-generator/notion_row.py path/to/report_data.json \
    --deck-url {{デッキURL}} --status 納品済み
```
- クライアント名・対象月・主要KPI・デッキURL・ステータス・QA結果の1行データが出力される
- スクリプトは**Notionに書き込まない**（ドライラン）。出力を確認・承認したうえで、
  Claude に「この行をNotion一覧DBに追記して」と依頼する（外部送信ゲート準拠）

---

## 3. 多クライアント運用のポイント
- テンプレ・スクリプトは共通。**フォルダとデータを差し替えるだけ**。
- デッキ名は `report_data.json` の `meta.deck_title`（`{client}_{ym}_分析レポート`）で自動命名。
- クライアント別の運用目的・ターゲットは `report_data.json` の `summary`/`next_actions` で調整。

### 他社展開で確認した差異（ドライラン知見 / TECNES）
実際に別アカウント（TikTok Studio web出力）で通して判明した、Step1の前提に対する差異と対処:
| 差異 | 対処 |
|---|---|
| **ファイル名が固定規則と全く違う**（`screencapture-tiktok-...png` 等） | **命名は不問**。Claudeが各画像を読んで内容で分類するため、フォルダに入れるだけでよい。Step1の命名規則は「あれば望ましい」程度 |
| 期間が1つだけ（4期間に分かれていない） | slide6は1期間で成立。月次推移は十分なデータが無ければ「視聴数上位の投稿一覧」で代替（`monthly_table` のヘッダを差し替え） |
| 投稿別インサイトが上位数本しか無い | 上位投稿（詳細スクショがある分）で slide9/10-12 を構成。`monthly_table` は取れる範囲で |
| `read_file_content` が**空文字**を返すPNGがある（グラフ画像等） | `download_file_content`（base64）→ デコードして画像としてビジョン読取（`pdftotext`同様の二段構え） |
| 総投稿数・投稿頻度・@ハンドルがスクショに無い | 該当キーを**省略**（slide6はテンプレ初期値が残る）か、運用者が補足。提出前に手当て |
| %が桁外れに大きい（立ち上げ期 +3,301% 等） | そのまま記載で問題なし（テンプレに収まる） |

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
- `WebApp.gs` / `WebAppUi.html` … Web App（フォルダURLを貼るだけの実行ページ）
- `Inspect.gs` … テンプレ構造ダンパ（レイアウト変更時のみ）
- `build_report_data.py` … 抽出マスター→report_data 変換（CLI・再利用可）
- `qa_check.py` … report_data の自動QAチェックリスト（提出前の抜け漏れ・誤読検知）
- `notion_row.py` … Notion一覧DB追記用の1行データ生成（ドライラン専用）
- `schema/report_data.schema.json` … データ契約
- `samples/REVECAREERAGENCY_2026-06.*` … 実例（extraction_master / report_data）
