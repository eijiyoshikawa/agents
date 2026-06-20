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
   - （任意）`supabase/seed.sql` … サンプルデータを入れる場合
3. **Project Settings → API** から以下を控える
   - Project URL
   - `anon` public key
   - `service_role` key（秘匿）

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

## 現時点で「コード側で完了済み」のもの（手作業不要）

- ドメインモデル・3段階報酬エンジン（自己成約ルール込み）＋テスト 21件
- リーダーボード・重点サポート判定
- 紹介ツリー UI（管理ダッシュボード / パートナー個別ページ）
- サービス・報酬プラン表示（率は `data/services.ts` で追加・変更可能）
- Supabase スキーマ・RLS・登録 RPC（SQL 一式）
- seed ↔ Supabase 自動切替のデータ層
- パートナー登録フォーム（`/register`、招待コード `?ref=` 対応）
- 招待コード・スラッグ生成（衝突回避ロジック）＋テスト
- Notion 連携の実装（トークン設定で送信、未設定ならスタブ）

## 残タスク（v1 後半 / v2・要相談）

- パートナーログイン（Supabase Auth）→ 自分のツリーのみ閲覧
- 成約入力・ステータス変更の管理 UI（現状は SQL / seed で管理）
- 登録完了をトリガに Notion 自動同期（Edge Function）
- 静的エクスポート → Vercel 動的レンダリングへ移行し、新規パートナーページを即時発行
- Stripe 連携による報酬支払の自動化
