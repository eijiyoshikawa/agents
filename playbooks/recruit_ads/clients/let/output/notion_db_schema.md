# Notion 応募管理 DB スキーマ

> LET 採用応募管理用 Notion DB の構築テンプレ
> 用途: 配信開始前にユーザーが Notion 側で DB を作成 → CSVインポート or 手動構築

## DB 名

**「LET 採用応募管理 2026」**

## プロパティ一覧（カラム定義）

| プロパティ名 | 型 | 用途 | 必須 | 初期値/選択肢 |
|---|---|---|---|---|
| `応募者ID` | Title | 主キー（自動でA-001等） | ✓ | テキスト自動採番 |
| `応募日時` | Date | applied_at | ✓ | LINE 友だち追加日時 |
| `応募者氏名` | Text | フルネーム | | |
| `年齢` | Number | 数字 | | |
| `性別` | Select | M / F / Other / NoAnswer | | |
| `前職業種` | Select | SaaS / 人材 / 広告 / 商社 / 不動産 / メーカー / その他 | | |
| `前職職種` | Select | 法人営業 / マーケ / テレアポ / 個人営業 / その他 | | |
| `法人営業経験年数` | Number | 必須要件チェック用 | | |
| `流入元LP` | Select | lp-a / lp-b / direct / unknown | ✓ | lp-a |
| `流入元LINE追加URL` | URL | lin.ee/QlrbDga (LP-A) / lin.ee/Qmxrf8O (LP-B) | | |
| `媒体推定` | Select | meta / tt / line / organic / referral / unknown | | unknown |
| `Campaign名` | Text | UTM campaign | | |
| `Ad名` | Text | UTM content (CRTV ID 含む) | | |
| `AdSet名` | Text | UTM term | | |
| `EXP-ID` | Text | 紐付け実験ID | | EXP-20260525-001 |
| `訴求軸` | Select | H1 / H2 / H3 / H5 / H6 / H7 | | |
| `形式` | Select | F1-UGC / F2-Text / F3-Static | | |
| `応募チャネル` | Select | LINE / Form / 紹介 | ✓ | LINE |
| `ステータス` | Select | Lead → Contacted → Casual → 1st → Final → Offer → Hire / Declined / Inactive | ✓ | Lead |
| `連絡到達` | Checkbox | reachable | | false |
| `面談実施日` | Date | カジュアル面談 | | |
| `1次面接日` | Date | | | |
| `最終面接日` | Date | | | |
| `内定日` | Date | offer | | |
| `採用日` | Date | hire | | |
| `90日定着` | Checkbox | retained_90d | | false |
| `辞退理由` | Text | Declined時の理由 | | |
| `LINE トーク履歴URL` | URL | LINE側参照リンク | | |
| `担当者` | Person | LET側担当 | | |
| `備考` | Text | 自由記述 | | |
| `更新日時` | Last edited | 自動 | | auto |
| `作成日時` | Created time | 自動 | | auto |

## 必須ビュー（5つ）

### View 1: ファネル俯瞰
- **タイプ**: Board（ステータス別）
- **グループ**: ステータス
- **カード表示**: 応募者氏名 / 流入元LP / EXP-ID

### View 2: 流入元別
- **タイプ**: Table
- **フィルタ**: なし
- **グループ**: 流入元LP
- **表示列**: 応募日時 / 応募者氏名 / ステータス / 媒体推定 / EXP-ID

### View 3: 訴求軸別パフォーマンス
- **タイプ**: Table
- **グループ**: 訴求軸
- **集計**: ステータス別件数

### View 4: 直近30日
- **タイプ**: Table
- **フィルタ**: 応募日時 ≥ 過去30日
- **ソート**: 応募日時 降順

### View 5: 採用済社員
- **タイプ**: Table
- **フィルタ**: ステータス = Hire
- **表示列**: 採用日 / 応募者氏名 / 流入元LP / 訴求軸 / 90日定着

## ステータス遷移ルール

```
Lead (新規応募)
  ↓ 連絡到達
Contacted (連絡到達)
  ↓ カジュアル面談予約
Casual (カジュアル面談)
  ↓ 1次面接予約
1st (1次面接)
  ↓ 最終面接予約
Final (最終面接)
  ↓ 内定
Offer (内定)
  ↓ 入社
Hire (採用)
  
※ いずれの段階でも:
  - 辞退 → Declined
  - 連絡不通 → Inactive
```

## CSV インポート用ヘッダ

CSV で作成する場合の1行目（ヘッダ）:

```csv
応募者ID,応募日時,応募者氏名,年齢,性別,前職業種,前職職種,法人営業経験年数,流入元LP,流入元LINE追加URL,媒体推定,Campaign名,Ad名,AdSet名,EXP-ID,訴求軸,形式,応募チャネル,ステータス,連絡到達,面談実施日,1次面接日,最終面接日,内定日,採用日,90日定着,辞退理由,LINEトーク履歴URL,担当者,備考
```

サンプル行（テスト用）:

```csv
A-001,2026-06-04 10:30,テスト太郎,28,M,SaaS,法人営業,3,lp-a,https://lin.ee/QlrbDga,tt,tt_eigyo_osaka-city_cv_202606_001,ugc_c001_a,smart-audience_h1-salary_m,EXP-20260525-001,H1,F1-UGC,LINE,Lead,false,,,,,,false,,,,初回テストデータ
```

## 関連ツール連携

### LINE Webhook → Notion 自動投入（任意・Phase 2）

LINE 公式アカウントの友だち追加イベントを Webhook で受け、Cloud Functions / Make.com / Zapier 経由で Notion API へ投入。

```
LINE OA 友だち追加
  ↓ Webhook (https://...)
Cloud Function / Make.com
  ↓ Parse: friend_add_url で LP-A/B 判定
  ↓ Notion API POST /v1/pages
Notion DB に1行追加
  ↓ 担当者通知（Slack / メール）
```

Phase 1 は手動転記でOK（月応募 < 30件想定）。

### Google Sheets ミラー

Notion → Sheets ミラーは Apps Script + Notion API で実装可能。Looker Studio 連携時に検討。

## 構築手順（ユーザー向け）

1. Notion で新規ページ → 「LET 採用応募管理 2026」作成
2. ページ内に「データベース - インライン」追加
3. 上記プロパティを1つずつ追加（型・選択肢設定）
4. ビュー5つを順次作成
5. 担当者と共有
6. （任意）API インテグレーション設定 → Internal Integration Token 取得

## ガバナンス

- PII（応募者氏名・電話番号）を含むため、**社外共有は厳禁**
- API トークンは社内秘、リポジトリにコミットしない
- 担当者の Notion 権限は「編集者」、CEO/COO は「閲覧者」程度から開始
- 月次バックアップ（Notion Export CSV）

## Retriever Agent 連携

CLAUDE.md の組織構成に従い、Retriever Agent が Notion DB を取得して
`agents/retriever/output.json` に構造化保存 → Marketing/Data Analyst が分析。
