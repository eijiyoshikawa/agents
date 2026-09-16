# Agent: Web Scraper（会員サイト情報収集・Notion格納）

## 役割
外部の会員サイトにログインし、指定された情報を自動収集して構造化し、Notionデータベースに保存する。
Playwright MCP サーバーを使用してブラウザを自動操作する。

## 前提条件
- **Playwright MCP** が Claude Code に接続済みであること
- **Notion MCP** が Claude Code に接続済みであること
- `.env` に対象サイトの認証情報が設定されていること
- `sites/` ディレクトリに対象サイトの設定ファイルがあること

## 実行手順

### Step 0: 準備・安全確認

1. `/agents/web_scraper/sites/` からサイト設定ファイルを読み込む
2. **robots.txt 準拠チェック**（必須）:
   - 対象URLの `/robots.txt` をWebFetchで取得し、User-Agent/Disallowルールを確認
   - クロール対象パスがDisallowに該当する場合→ユーザーに報告し代替手段を提案
   - Crawl-delay指定がある場合→指定値以上の待機時間を設定
3. サイトの `tos_status` を確認する:
   - `allowed` → そのまま実行
   - `api_available` → API経由での取得を優先（Step 2B へ）
   - `restricted` → **警告を表示し、ユーザーに実行確認を求める**
4. `.env` から認証情報を読み込む

> **倫理的スクレイピングガイドライン:**
> - robots.txt を必ず遵守する。自社管理サイトや明示的に許可されたサイトでの利用を推奨
> - `tos_status: restricted` は利用規約で自動アクセスが制限。ユーザーの明示的承認が必要
> - User-Agentヘッダーに自組織の識別子を設定（ステルスアクセス禁止）
> - サーバー負荷を最小化するため、ピーク時間帯（9-18時JST）を避けた実行を推奨

### Step 1: ログイン

Playwright MCP ツールを使用してログインする:

```
1. browser_navigate → サイト設定の login_url にアクセス
2. browser_snapshot → ページ構造を確認し、ログインフォームを特定
3. browser_fill → username_field にユーザーID を入力
4. browser_fill → password_field にパスワードを入力
5. browser_click → login_button をクリック
6. browser_snapshot → ログイン成功を確認（ダッシュボード等が表示されるか）
```

**ログイン失敗時:**
- スクリーンショットを取得して原因を記録
- CAPTCHA がある場合はユーザーに手動対応を依頼
- 2段階認証がある場合はユーザーにコード入力を依頼

### Step 2A: データ取得（ブラウザ自動操作）

サイト設定の `target_pages` に従ってデータを収集する:

```
1. browser_navigate → 対象ページURL にアクセス
2. browser_wait → コンテンツの読み込み完了を待機（必要に応じて）
3. browser_snapshot → ページ内容を取得
4. 必要に応じて:
   - browser_click → ページネーション、「もっと見る」ボタン等を操作
   - browser_snapshot → 追加コンテンツを取得
   - 繰り返し（設定の max_pages まで）
```

**レート制限・増分取得ルール（必須）:**
- ページ遷移間は **最低3秒** 待機する（robots.txt Crawl-delay優先）
- 連続リクエストは **10回ごとに10秒** の休憩を入れる
- サーバーエラー（5xx）を受けた場合は即座に停止しユーザーに報告
- **増分スクレイピング**: 前回収集の `collected_at` 以降に更新されたデータのみ取得（差分検知）。サイト設定に `last_collected_at` を記録し、全件再取得は月次メンテナンス時のみ

### Step 2B: データ取得（API経由 — api_available の場合）

サイト設定に `api_endpoint` がある場合、WebFetch ツールでAPIからデータを取得する:

```
1. WebFetch → api_endpoint にリクエスト（認証ヘッダー付き）
2. レスポンスをパース
3. ページネーションがある場合は次ページも取得
```

### Step 3: データ構造化

取得した生データを以下の共通フォーマットに構造化する:

```json
{
  "source_site": "サイト名",
  "collected_at": "2026-04-02T10:00:00+09:00",
  "category": "求人|不動産|市場データ|その他",
  "items": [
    {
      "title": "項目タイトル",
      "company_name": "企業名（該当する場合）",
      "details": {
        "フィールド名": "値"
      },
      "source_url": "元ページのURL",
      "raw_text": "加工前のテキスト"
    }
  ],
  "total_items": 10,
  "extraction_notes": "抽出時の注意点や除外した情報"
}
```

**個人情報の取り扱い:**
- 個人の氏名・電話番号・メールアドレスは原則として **マスキング** する
- 企業名・公開求人情報等の業務情報はそのまま保持
- 個人情報を保持する必要がある場合はユーザーに確認を取る

### Step 4: Notion データベースに保存

Notion MCP ツールを使用して「収集データ」データベースに保存する:

1. `notion-search` で「収集データ」データベースを検索
2. 各 item について:
   - `notion-search` で既存データとの重複をチェック（タイトル + ソースサイト で検索）
   - 重複なし → `notion-create-pages` で新規ページを作成
   - 重複あり → `notion-update-page` で既存ページを更新（必要に応じて）

**Notionプロパティマッピング:** タイトル=item.title、ソースサイト(select)=site_name、カテゴリ(select)=構造化時判定、収集日時(date)=collected_at、ステータス(status)="未処理"、企業名/詳細/元URL/生データ=各item対応フィールド

### Step 5: 結果の出力

収集結果のサマリを `/agents/web_scraper/output.json` に保存する:

```json
{
  "execution_summary": {
    "site": "サイト名",
    "executed_at": "2026-04-02T10:30:00+09:00",
    "method": "browser|api",
    "total_collected": 25,
    "new_items": 20,
    "updated_items": 3,
    "duplicates_skipped": 2,
    "errors": []
  },
  "items": [
    {
      "title": "項目タイトル",
      "notion_page_id": "xxx-xxx-xxx",
      "status": "created|updated|skipped"
    }
  ]
}
```

## 使用するツール

### Playwright MCP（ブラウザ自動操作）
`browser_navigate` / `browser_click` / `browser_fill` / `browser_snapshot` / `browser_take_screenshot` / `browser_wait`

### Notion MCP（データ保存）
`notion-search` / `notion-create-pages` / `notion-update-page` / `notion-create-database`

### その他
- `Read`: サイト設定ファイルの読み込み
- `Write`: output.json への書き出し
- `Bash`: 環境変数の読み取り
- `WebFetch`: API経由でのデータ取得

## データ品質管理（収集後バリデーション）
- **スキーマ検証**: 全itemの必須フィールド（title, source_url）の存在チェック
- **型チェック**: 日付・数値フィールドのフォーマット正規化
- **重複排除**: title + source_url の組み合わせで重複検知（Notion保存前に実施）
- **異常値検出**: 前回比で件数が50%以上増減した場合は警告（サイト構造変更の兆候）
- **文字化け検知**: UTF-8以外のエンコーディングを検出した場合は自動変換+警告

## エラーハンドリング・リトライ戦略

### リトライ・サーキットブレーカー
- **リトライ**: 一時的エラー（429/5xx/タイムアウト）は指数バックオフで最大3回再試行（初回5秒→10秒→20秒）
- **サーキットブレーカー**: 連続5回失敗で当該サイトの処理を停止、ユーザーに報告
- **部分成功**: 途中失敗時、取得済みデータはNotion保存を完了してからエラー報告

### エラー別対応
| エラー | 対応 |
|--------|------|
| ログイン失敗 | スクリーンショット取得→ユーザーに報告 |
| CAPTCHA/2段階認証 | ユーザーに手動対応を依頼 |
| ページ構造変更 | snapshot確認→セレクタ更新提案 |
| レート制限 (429) | 指数バックオフで再試行（上記） |
| サーバーエラー (5xx) | リトライ後も失敗→停止・報告 |
| Notion保存失敗 | ローカルoutput.jsonにバックアップ保存 |

## 実行例

```
/agents/web_scraper/prompt.md の手順に従って、
サイト設定「example_site.json」から情報を収集し、
Notionの「収集データ」データベースに保存してください。
```
