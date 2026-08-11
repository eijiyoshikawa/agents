# サイト設定ガイド

## 概要
`sites/` ディレクトリには、情報収集対象サイトごとの設定ファイル（JSON）を配置する。
`template.json` をコピーして、対象サイトに合わせて編集する。

## 設定ファイルの作成手順

### 1. テンプレートをコピー
```bash
cp sites/template.json sites/my_site.json
```

### 2. 基本情報を設定

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `site_name` | サイト表示名 | `"Indeed"` |
| `description` | サイトの概要 | `"求人情報サイト"` |
| `login_url` | ログインページURL | `"https://secure.indeed.com/auth"` |
| `category` | データカテゴリ | `"求人"` / `"不動産"` / `"市場データ"` |

### 3. 認証情報の環境変数名を設定

```json
"credentials_env": {
  "username": "SITE_INDEED_USERNAME",
  "password": "SITE_INDEED_PASSWORD"
}
```

対応する値を `.env` ファイルに追加:
```env
SITE_INDEED_USERNAME=your_email@example.com
SITE_INDEED_PASSWORD=your_password
```

### 4. セレクタを設定

対象サイトのログインフォーム要素を指定:

```json
"selectors": {
  "username_field": "#login-email-input",
  "password_field": "#login-password-input",
  "login_button": "#login-submit-button",
  "login_success_indicator": ".gnav-header-user"
}
```

**セレクタの調べ方:**
1. ブラウザでサイトのログインページを開く
2. F12（開発者ツール）→ Elements タブ
3. 対象要素を右クリック → 「Copy selector」
4. または Playwright MCP の `browser_snapshot` でアクセシビリティツリーから特定

### 5. 取得対象ページを設定

```json
"target_pages": [
  {
    "name": "応募者管理",
    "url": "https://example.com/employer/candidates",
    "description": "応募者一覧と応募状況",
    "extract_fields": [...],
    "pagination": {
      "enabled": true,
      "next_button_selector": ".next-page",
      "max_pages": 10
    }
  }
]
```

### 6. 利用規約ステータスを設定（重要）

| tos_status | 意味 | 推奨アクション |
|-----------|------|--------------|
| `allowed` | 自動アクセスが許可されている | そのまま自動実行可能 |
| `api_available` | 公式APIが利用可能 | API経由での取得を優先 |
| `restricted` | 自動アクセスがToSで制限されている | 実行前に警告表示。自己責任で実行 |

```json
"tos_status": "restricted",
"tos_notes": "利用規約第X条で自動アクセスツールの使用を禁止"
```

### 7. レート制限を設定

```json
"rate_limit": {
  "min_interval_seconds": 3,
  "max_requests_per_session": 50,
  "pause_after_n_requests": 10,
  "pause_duration_seconds": 10
}
```

## ファイル命名規則

`{サイト名_英語小文字}.json` で統一する:
- `indeed.json`
- `bizreach.json`
- `suumo.json`
- `my_company_portal.json`

## セキュリティ注意事項

- `.env` ファイルは **絶対に Git にコミットしない**（`.gitignore` に含まれている）
- サイト設定ファイルにパスワードを直接書かない（環境変数名のみ記載）
- 設定ファイルの `credentials_env` には環境変数の **キー名** のみを記載する
