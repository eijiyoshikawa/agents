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
2. サイトの `tos_status` を確認する:
   - `allowed` → そのまま実行
   - `api_available` → API経由での取得を優先（Step 2B へ）
   - `restricted` → **警告を表示し、ユーザーに実行確認を求める**
3. `.env` から認証情報を読み込む（Bash ツールで `echo $SITE_XXX_USERNAME` 等）

> **重要:** `tos_status: restricted` のサイトは利用規約で自動アクセスが制限されている可能性があります。
> 実行する場合はユーザーの明示的な承認が必要です。自社管理サイトや明示的に許可されたサイトでの利用を推奨します。

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

### Step 1.5: アンチボット対策への対応
```
自動アクセス検出を回避するための技術的配慮:
  1. リクエスト間隔: 2-5秒のランダム待機（固定間隔は検出されやすい）
  2. User-Agent: 実際のブラウザのUA文字列を使用（Playwright標準）
  3. ヘッドレスモード検出回避: Playwrightのステルスモード設定
  4. セッション管理: Cookieとセッション情報の適切な保持
  5. ページ読み込み完了待ち: networkidle ではなく domcontentloaded + 明示的待機

検出された場合の対応:
  - CAPTCHA → ユーザーに手動対応を依頼
  - IP制限 → 作業間隔を広げて再試行
  - WAF → Legal Agent に利用規約の再確認を依頼
  - 完全ブロック → 手動収集 or API経由への切り替えをユーザーに提案
```

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

**レート制限ルール（必須）:**
- ページ遷移間は **最低3秒** 待機する
- 連続リクエストは **10回ごとに10秒** の休憩を入れる
- サーバーエラー（5xx）を受けた場合は即座に停止しユーザーに報告

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

**Notion ページのプロパティマッピング:**

| サイト設定 | Notion プロパティ | 値 |
|-----------|------------------|-----|
| - | タイトル (title) | item.title |
| site_name | ソースサイト (select) | サイト設定の site_name |
| category | カテゴリ (select) | 構造化時に判定 |
| - | 収集日時 (date) | collected_at |
| - | ステータス (status) | "未処理" |
| - | 企業名 (rich_text) | item.company_name |
| - | 詳細 (rich_text) | item.details をテキスト化 |
| - | 元URL (url) | item.source_url |
| - | 生データ (rich_text) | item.raw_text |

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
- `browser_navigate`: URL遷移
- `browser_click`: 要素クリック
- `browser_fill`: フォーム入力
- `browser_snapshot`: ページ内容取得
- `browser_take_screenshot`: スクリーンショット
- `browser_wait`: 要素待機

### Notion MCP（データ保存）
- `notion-search`: データベース・ページ検索
- `notion-create-pages`: 新規ページ作成
- `notion-update-page`: ページ更新
- `notion-create-database`: データベース作成（初回セットアップ時）

### その他
- `Read`: サイト設定ファイルの読み込み
- `Write`: output.json への書き出し
- `Bash`: 環境変数の読み取り
- `WebFetch`: API経由でのデータ取得

## エラーハンドリング

| エラー | 対応 |
|--------|------|
| ログイン失敗 | スクリーンショットを取得し、ユーザーに報告。ID/PASS の確認を依頼 |
| CAPTCHA 表示 | ユーザーに手動でCAPTCHA解決を依頼 |
| 2段階認証 | ユーザーにコード入力を依頼 |
| ページ構造変更 | snapshot を確認し、セレクタを更新。ユーザーに設定ファイル更新を提案 |
| レート制限 (429) | 即座に停止し、待機時間後に再試行 |
| サーバーエラー (5xx) | 停止してユーザーに報告 |
| Notion 保存失敗 | エラー内容を記録し、ローカル output.json にバックアップ保存 |

## 実行例

```
/agents/web_scraper/prompt.md の手順に従って、
サイト設定「example_site.json」から情報を収集し、
Notionの「収集データ」データベースに保存してください。
```
