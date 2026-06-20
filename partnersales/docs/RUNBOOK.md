# PartnerSales 立ち上げランブック（手作業の手順）

コード側の実装（v1）は完了しています。**ここから先は外部サービスの設定が必要**で、
クレデンシャルが絡むため運用者（あなた）の手作業になります。上から順に実施してください。

> 何も設定しなくても、現状アプリは **seed データで動作・ビルド** できます。
> 下記を行うと本番データ（Supabase / Notion）に切り替わります。

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
   - Project URL
   - `anon` public key
   - `service_role` key（秘匿）
4. **スタッフ合言葉を設定**（スタッフ管理画面 `/admin` のロック解除に使用）。SQL Editor で:
   ```sql
   select public.set_staff_secret('ここに任意の合言葉');
   ```

## 2. 環境変数を設定

`partnersales/.env.local` を作成（`.env.example` をコピー）し、値を入れる:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

設定後 `npm run dev` で起動すると、ダッシュボードのデータが Supabase 由来に切り替わる
（左上の表示が `source: supabase` になる）。未設定なら `seed` のまま。

## 3. デプロイ（Vercel との連携が切れているため手動）

現状 Vercel↔GitHub 連携が途絶しているので、当面はどちらか:

- **A. Vercel CLI で手動デプロイ**
  ```bash
  npm i -g vercel
  cd partnersales
  vercel            # 初回はプロジェクト紐付け
  vercel --prod     # 本番反映
  ```
  Vercel の Project → Settings → Environment Variables に手順2の値を登録。
- **B. 静的ホスティング**（GitHub Pages / Cloudflare Pages 等）
  ```bash
  npm run build     # out/ に静的サイトが出力される
  ```
  `out/` を配信。`NEXT_PUBLIC_BASE_PATH` をサブパス配信時に設定。

> 連携を復旧する場合: GitHub リポジトリ → Vercel で Import し直し、Root Directory を
> `partnersales` に設定。以降は push で自動デプロイ。

## 4. Notion 連携（紹介者を DB_協業先管理 に自動追加）

マッピングは実スキーマに合わせて実装済み（`lib/integrations/notion.ts`）。
連携先: `DB_協業先管理`（database id `007f6461b55d4013879bd4a94abbc05c`）。

1. https://www.notion.so/my-integrations で **内部インテグレーション** を作成 → トークン取得
2. `DB_協業先管理` のページ右上「···」→「コネクト」→ 作成したインテグレーションを追加（**共有設定が必須**）
3. 環境変数 `NOTION_TOKEN` を設定（サーバ／スクリプト側のみ。ブラウザには出さない）
4. 動作確認: `lib/integrations/notion.ts` の `syncPartnerToNotion(partner)` を
   サーバ環境で呼ぶ（v1 後半で「登録完了 → 自動同期」を Supabase Edge Function 化予定）

> マッピング内容: 顧問先名←会社名 / カテゴリ←「パートナー」/ 担当者名 / メールアドレス /
> 紹介元←親パートナー名 / 報酬体系←招待コード入り説明 / 関係性ステータス←status / 契約開始日←登録日。
> プロパティ名が変わった場合は `buildNotionProperties` を調整（テストあり）。

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
2. アポ後、`/admin` →「パートナー登録」タブで会社情報を入力し、
   未割り当ての **ログインID を割り当て**て登録（招待コードと個別ページが発行される）
3. パートナーは `/login` で ID/PASS を入力 → 自分の個別ページへ

> ⚠️ 静的サイトでは個別ページ（`/partners/[slug]`）は URL を知れば閲覧可能です。
> 真に非公開にするには動的レンダリング（Vercel）＋認証ゲートへの移行が必要（次の増分で対応可）。

## 6. 支払い運用（管理は `/admin` →「支払い」タブ）

- 累計確定報酬の **未精算が ¥50,000 に達すると「請求書発行依頼」** 状態になる（下限未満は繰越）
- 紹介者から請求書を受領したら「請求書受領」を押す → `invoiced`（入金待ち）
- 弊社から銀行振込後「振込完了」を押す → `paid`
- 支払いは **弊社からの銀行振込のみ**（Stripe 等の決済連携なし）

---

## 現時点で「コード側で完了済み」のもの（手作業不要）

- ドメインモデル・3段階報酬エンジン（自己成約ルール込み）＋テスト 21件
- リーダーボード・重点サポート判定
- 紹介ツリー UI（管理ダッシュボード / パートナー個別ページ）
- サービス・報酬プラン表示（率は `data/services.ts` で追加・変更可能）
- Supabase スキーマ・RLS・各種 RPC（SQL 一式、合言葉ガード）
- seed ↔ Supabase 自動切替のデータ層
- **スタッフ管理画面 `/admin`**（成約入力・ステータス変更 / 支払い精算 / パートナー登録）
- **パートナーログイン `/login`**（事前発行の ID/PASS）
- **支払い精算ロジック**（¥50,000 下限・銀行振込・請求書フロー）＋テスト
- **認証情報の一括発行スクリプト**（Notion 保管用 CSV + ハッシュ登録 SQL）＋テスト
- 招待コード・スラッグ生成（衝突回避ロジック）＋テスト
- Notion 連携の実装（トークン設定で送信、未設定ならスタブ）

## 残タスク（v1 後半 / v2・要相談）

- 個別ページの非公開化（Supabase Auth セッション + Vercel 動的レンダリングへ移行）
- 登録完了をトリガに Notion 自動同期（Supabase Edge Function）
- 報酬の月次締め・支払い明細書の自動生成
- 個別ページの即時発行（動的レンダリング化に伴い、ビルド不要に）
