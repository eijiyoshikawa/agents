# インシデントレポート: Notion API 10,000件上限によるフル同期の沈黙的欠損

- **発生日**: 2026-09-29 〜 2026-09-30（復旧済み）
- **影響範囲**: Sales Cockpit の Neon キャッシュ（`sc_customers`）から約18,500社が一時消失。Notion 原本は無傷
- **重大度**: High（営業リスト・分析の母数が 28,556 → 10,000 に減少）
- **ステータス**: ✅ 復旧完了（PR #38 / #39）・再発防止ガード実装済み

## 症状

`/api/sync?mode=full` の結果が全28,556社に対して **ちょうど10,000件** で止まる:

```json
{"ok":true,"mode":"full","customers":10000,"truncated":false,"suspected_partial":false}
```

- エラーは一切出ない（`ok:true`）
- `truncated:false` のため、フル同期の古い行削除（`DELETE FROM sc_customers WHERE synced_at < stamp`）が実行され、取得できなかった約18,500行がキャッシュから削除された

## 根本原因

**2026年初頭の Notion API 仕様変更**: ページネーション（`databases.query` / `data_sources.query` とも）は **1クエリあたり最大10,000件** で打ち切られる。

最悪な点は打ち切り時の応答が通常の最終ページと同じ `has_more: false` / `next_cursor: null` であること。唯一のシグナルは `request_status: { type: "incomplete", incomplete_reason: "query_result_limit_reached" }` で、これをチェックしないコードは**エラーなく静かに欠損する**。

### 調査の経緯（ハマりポイント）

1. 当初は「マルチデータソース移行で旧 `databases.query` が10,000件上限になった」と推定し、新API `POST /v1/data_sources/{id}/query`（`Notion-Version: 2025-09-03`）へ移行（PR #38）→ **解消せず**。上限は新APIにも等しく適用される
2. Notion MCP の SQL カウントで原本が28,556件であることを確認し、API側の打ち切りと確定
3. 公式ガイド「Query large data sources」に回避策が明記されていた（下記）
4. デプロイ直後の実行が旧デプロイに当たる「すれ違い」も発生。**修正確認は必ずランタイムログの `dep=dpl_...` で処理デプロイIDを確認する**

## 恒久対策（実装済み）

### 1. ウィンドウ分割クエリ（`lib/notion.ts` の `queryAll`）— PR #39

公式推奨の回避策。上限は「クエリ単位」なので、クエリを発行し直せば1万件の枠が回復する:

- 全クエリを `created_time` **昇順** でソート
- `request_status.type === "incomplete"` または1クエリで10,000件到達を検知したら、最後の行の `created_time` 以降（`on_or_after`）で絞った**新しいクエリ**を発行して続きを取得
- 境界行の重複はページIDの `Set` で排除
- 同一 `created_time` に1万件超が集中した場合の無限ループガード付き（進捗ゼロなら警告して打ち切り）

### 2. 大量削除ガード（`lib/db.ts` の `syncAll`）— PR #38

Notion 側の仕様が今後また変わっても**キャッシュの大量削除だけは起きない**ようにする最後の砦:

- full 同期の削除前に「今回の取得でカバーされなかった既存キャッシュ行数」を数える
- それが取得件数の **15%超 かつ 500行超** なら部分取得を疑い、`DELETE` をスキップ
- レスポンスに `suspected_partial: true` を返して異常を通知（正常時は `false`）

### 3. 新API移行とフォールバック（`lib/notion.ts`）— PR #38

- `data_sources.query`（`Notion-Version: 2025-09-03`）を優先、失敗時は旧 `databases.query` へ自動フォールバック（警告ログ付き）
- `data_source_id` は `databases.retrieve` で解決しプロセス内キャッシュ

## 教訓（他プロジェクトにも適用）

1. **外部APIの「全件取得」は打ち切りシグナルを必ず検証する。** `has_more:false` は「全部取れた」を意味しない。件数がキリの良い数字（10,000ちょうど等）で止まったら仕様上限を疑う
2. **キャッシュの一括削除は「取得が完全である」ことを検証してから行う。** 削除前ガード（取得件数 vs 既存件数の比較）を必ず入れる
3. **原本とキャッシュの件数照合を切り分けの最初に行う。** 今回は Notion MCP の `SELECT COUNT(*)` で原本28,556件を即確認でき、API側の問題と確定できた
4. **デプロイ直後の動作確認は、処理したデプロイIDをログで確認する。** 本番エイリアスの切り替えと数十秒すれ違うことがある

## 正常性の確認方法

```
https://salescockpit-let.vercel.app/api/sync?mode=full
```

- `customers` ≈ 28,556（Notion原本の件数と一致すること）
- `suspected_partial: false`
- 所要時間 約3.5分（Vercel maxDuration 300秒以内）

Notion 原本の件数は Notion MCP で確認:

```sql
SELECT COUNT(*) FROM "collection://c1435a40-3b2f-4653-8a11-255f39060831"
```

## 関連

- PR #38: data_sources.query 移行＋大量削除ガード
- PR #39: created_time ウィンドウ分割による10,000件上限回避
- 参考: [Notion Docs — Query large data sources](https://developers.notion.com/guides/data-apis/query-large-data-sources)
