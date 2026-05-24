# Recruitment LP Template

採用専用LPテンプレート。1つのNext.jsプロジェクトで3つのデザイン（modern / classic / pop）を切り替え可能。

## トーン3パターン

| テンプレ | 想定業種 | 特徴 |
|---------|---------|------|
| `modern` | IT / SaaS / コンサル | ミニマル・余白多め・モノクロ+エメラルド |
| `classic` | 不動産 / 金融 / 老舗 | ネイビー+ゴールド・セリフ書体・王道採用LP |
| `pop` | 美容 / 飲食 / D2C | ピンク+イエロー・大胆タイポ・ニューブルータリズム |

## ローカル起動

```bash
npm install
npm run dev
# http://localhost:3000
```

## テンプレ切り替え
`data/company.json` の `template` フィールドを変更:

```json
{ "template": "modern" }  // or "classic" or "pop"
```

## データスキーマ
`lib/types.ts` を参照。最低限以下が必要:

- `company.name`（必須）
- `company.slug`（必須・英小文字スラッグ）
- `services`（最低1件）
- `jobs`（最低1件）

## 自動生成パイプライン
このテンプレートは `/agents/recruitment_lp_generator/` のエージェント群から呼び出されます。

```bash
bash scripts/generate-recruitment-lp.sh --url "https://example.com" --template auto
```

## デモ用途
応募フォームはダミーUIです。実際の送信処理は行われません。
本実装時は `components/common/ApplicationForm.tsx` に Resend / SendGrid / Notion 等の送信処理を追加してください。
