# PartnerSales 立ち上げランブック（手作業の手順）

アプリ側の実装は完了しています。**ここから先は外部サービスの設定が必要**で、
クレデンシャルが絡むため運用者（あなた）の手作業になります。上から順に実施してください。

> 認証ゲート付きの動的アプリです。**ログインには Supabase 設定が必須**（パートナーログイン）、
> スタッフログインは環境変数の合言葉で可能です。設定前でもビルドは通ります。

---

## 1. Supabase プロジェクトを作成（DB 永続化）

1. https://supabase.com でプロジェクトを新規作成（リージョンは東京 `ap-northeast-1` 推奨）
2. **SQL Editor** で以下を順に実行
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_register_rpc.sql`
   - `supabase/migrations/0004_credentials_payouts.sql`
   - （任意）`supabase/seed.sql` … サンプルデータを入れる場合
3. **Project Settings → API** から以下を控える
   - Project URL / `anon` public key / `service_role` key（秘匿）

## 2. 環境変数を設定

`partnersales/.env.local` を作成（`.env.example` をコピー）し、値を入れる:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SESSION_SECRET=（openssl rand -base64 32 などで生成した十分長い文字列）
STAFF_PASSPHRASE=（スタッフ管理画面ログイン用の合言葉）
NOTION_TOKEN=（任意・手順4）
```

- `AUTH_SESSION_SECRET` は**必須**（セッション Cookie の署名鍵）。本番で必ず設定。
- `STAFF_PASSPHRASE` 未設定時の開発既定値は `staff-demo`。
- `npm run dev` で起動 → `/staff/login` で合言葉ログイン → ダッシュボード表示
  （データ取得元は Supabase 設定時 `source: supabase`、未設定なら `seed`）。

## 3. デプロイ（**動的アプリ**：Node ランタイムが必要）

認証ゲート・サーバアクション・middleware を使うため、**静的エクスポートは不可**。
Vercel（推奨）か Node サーバで動かす。

- **A. Vercel CLI で手動デプロイ**（GitHub 連携が切れているため）
  ```bash
  npm i -g vercel
  cd partnersales
  vercel            # 初回はプロジェクト紐付け（Root Directory = partnersales）
  vercel --prod     # 本番反映
  ```
  Vercel の Project → Settings → Environment Variables に手順2の値を登録。
- **B. 自前 Node サーバ**
  ```bash
  npm run build && npm run start   # http://localhost:4100
  ```

> GitHub 連携を復旧する場合: Vercel で Import し直し、Root Directory を `partnersales` に設定。
> 以降は push で自動デプロイ。

## 4. Notion 連携（登録時に DB_協業先管理 へ自動追加）

登録（`/admin`）が成功すると、**`NOTION_TOKEN` 設定時は自動で Notion DB に行追加**されます。

1. https://www.notion.so/my-integrations で **内部インテグレーション** を作成 → トークン取得
2. `DB_協業先管理` のページ右上「···」→「コネクト」→ 作成したインテグレーションを追加（**共有が必須**）
3. 環境変数 `NOTION_TOKEN` を設定（サーバ側のみ。ブラウザには出さない）

> マッピング: 顧問先名←会社名 / カテゴリ←「パートナー」/ 担当者名 / メールアドレス /
> 紹介元←親パートナー名 / 報酬体系←招待コード入り説明 / 関係性ステータス←status / 契約開始日←登録日。
> プロパティ名が変わったら `lib/integrations/notion.ts` の `buildNotionProperties` を調整（テストあり）。

---

## 5. パートナーのログイン認証情報を事前発行（Notion 保管）

弊社が ID/PASS をパターン発行し、アポ後にスタッフが登録時へ割り当てる運用。

1. 認証情報を一括発行（例: 20件）
   ```bash
   cd partnersales
   node scripts/generate-credentials.mjs 20 1
   ```
   - **標準出力の CSV**（login_id, password）を **Notion 等に保管**（平文はここだけ）
   - 生成された **`credentials.sql`** を Supabase の SQL Editor で実行
     （`partner_credentials` に未割り当てとしてハッシュ登録。`credentials.sql` は `.gitignore` 済み）
2. アポ後、`/staff/login` でログイン → `/admin` →「パートナー登録」タブで会社情報を入力し、
   未割り当ての **ログインID を割り当て**て登録（招待コード・個別ページが発行され、Notion へも同期）
3. パートナーは `/login` で ID/PASS を入力 → **自分専用のマイページ `/me`** へ

> ✅ 個別データは認証ゲート済み。パートナーは `/me` で**自分のツリー・報酬・明細のみ**閲覧可能。
> スタッフは `/partners/[slug]` で任意のパートナーを閲覧可能（middleware でロール分離）。

## 6. 支払い運用（管理は `/admin` →「支払い」タブ）

- 累計確定報酬の **未精算が ¥50,000 に達すると「請求書発行依頼」** 状態になる（下限未満は繰越）
- 紹介者から請求書を受領したら「請求書受領」を押す → `invoiced`（入金待ち）
- 弊社から銀行振込後「振込完了」を押す → `paid`
- 支払いは **弊社からの銀行振込のみ**（決済連携なし）
- パートナーの `/me` と各詳細に **報酬明細・月次締め** を表示

---

## 「コード側で完了済み」（手作業不要）

- ドメインモデル・3段階報酬エンジン（自己成約ルール込み）＋テスト
- リーダーボード・重点サポート判定 / 報酬明細・月次締め
- **認証ゲート**（middleware + HMAC セッション）でロール分離
  - パートナー: `/login` → `/me`（自分のツリー・報酬・明細のみ）
  - スタッフ: `/staff/login` → ダッシュボード・`/admin`・`/partners/[slug]`
- **スタッフ管理画面 `/admin`**（成約入力・ステータス変更 / 支払い精算 / 登録）
  ※ 書き込みはサーバアクション + service_role（合言葉やキーをブラウザに出さない）
- **登録時の Notion 自動同期**（`NOTION_TOKEN` 設定時）
- Supabase スキーマ・RLS・RPC / seed ↔ Supabase 自動切替
- 支払い精算ロジック（¥50,000 下限・銀行振込・請求書フロー）
- 認証情報の一括発行スクリプト（CSV + ハッシュ登録 SQL）
- 招待コード・スラッグ生成（衝突回避）

## 残タスク（任意・将来）

- パスワード変更・リセット、ログイン失敗のレート制限
- 支払い明細書の PDF 出力・メール送付
- Notion 双方向同期（Notion 側の編集を取り込む）
