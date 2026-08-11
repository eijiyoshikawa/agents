# 建設業FAX番号収集パイプライン 一括実行プロンプト

以下のプロンプトを Claude Code にそのまま貼り付けて実行してください。
`{{都道府県}}` を実際の対象都道府県名に置き換えてから使ってください。
複数県を対象にする場合はカンマ区切りで指定してください（例: 東京都,大阪府,愛知県）。

---

## 実行プロンプト

```
以下の建設業FAX番号収集パイプラインを実行し、「{{都道府県}}」の
建設業者FAX番号リストを作成してください。

各エージェントのプロンプトは /agents/data_engineer/fax_collector/<agent_name>/prompt.md に定義されています。
各ステップで prompt.md を読み、指示に従って出力を生成してください。

### 実行順序:

1. **Source Scanner**: 「{{都道府県}}」で利用可能なデータソースを調査
   → /agents/data_engineer/fax_collector/source_scanner/output.json に保存

2. **Web Collector**: 特定されたデータソースからFAX番号を収集
   → /agents/data_engineer/fax_collector/output/raw/ に県別JSONで保存

3. **Data Normalizer**: 収集データの重複排除・形式統一・信頼度スコア付与
   → /agents/data_engineer/fax_collector/output/normalized/ に正規化済みデータ保存
   → /agents/data_engineer/fax_collector/output/fax_master.json にマスターリスト生成

4. **Compliance Checker**: 法務チェック・特定商取引法準拠確認
   → /agents/data_engineer/fax_collector/compliance_checker/output.json に法的注意事項保存
   → fax_master.json の compliance セクションを更新

5. **Notion 登録**: fax_master.json のデータを Notion に登録
   → Notion MCP の notion-create-pages を使用
   → parent: data_source_id「f82746bf-de5d-40fa-9077-66d27bff2639」
   → 送信状況は「未送信」をデフォルト設定
   → 100件ずつバッチで登録

各ステップ完了後、収集件数・FAX番号カバレッジ率を報告してから次に進んでください。
最終的にマスターリストの総件数・Notion登録件数・法的注意事項を報告してください。
```

---

## パイロット実行（東京都のみ）

初回は以下のプロンプトで東京都のみを対象にパイロット実行することを推奨します:

```
以下の建設業FAX番号収集パイプラインを実行し、「東京都」の
建設業者FAX番号リストを作成してください。

各エージェントのプロンプトは /agents/data_engineer/fax_collector/<agent_name>/prompt.md に定義されています。
各ステップで prompt.md を読み、指示に従って出力を生成してください。

### 実行順序:

1. **Source Scanner**: 「東京都」で利用可能なデータソースを調査
   → /agents/data_engineer/fax_collector/source_scanner/output.json に保存

2. **Web Collector**: 特定されたデータソースからFAX番号を収集
   → /agents/data_engineer/fax_collector/output/raw/tokyo.json に保存

3. **Data Normalizer**: 収集データの重複排除・形式統一・信頼度スコア付与
   → /agents/data_engineer/fax_collector/output/normalized/tokyo.json に正規化済みデータ
   → /agents/data_engineer/fax_collector/output/fax_master.json にマスターリスト

4. **Compliance Checker**: 法務チェック・特定商取引法準拠確認
   → /agents/data_engineer/fax_collector/compliance_checker/output.json

5. **Notion 登録**: fax_master.json のデータを Notion に登録
   → parent: data_source_id「f82746bf-de5d-40fa-9077-66d27bff2639」
   → 送信状況は「未送信」をデフォルト設定

各ステップ完了後、収集件数・FAX番号カバレッジ率を報告してください。
最終的にNotion登録件数を報告してください。
```
