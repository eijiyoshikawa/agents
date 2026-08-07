# 🚀 引き継ぎ（新セッション用）— SNS分析レポート自動生成

> **新しいセッションを開いたら、まず下の「キックオフ文」をそのまま貼ってください。**
> このファイル1枚で状況・ID・次の一手まで把握できます。
> 最終更新: 2026-08-07 / ブランチ: `claude/report-generator-handoff-w82m62`

---

## 0. 新セッションに貼るキックオフ文（コピペ用）

```
このリポジトリの scripts/report-generator/HANDOFF.md を読んで、前回セッションの続きを引き継いでください。
概要: 採用SNSの運用スクショから Google Slides 15枚の月次分析レポートを半自動生成する仕組みを構築済み。
- 本番実績: REVECAREERAGENCY 2026年6月（全15枚 生成・検証まで完了）
- ドライラン: TECNES 2026年6月（別企業で汎用性を実証・充填完了）
今日やりたいこと: 【ここに今日の依頼を書く。例: 「TECNESのレポートをNotion一覧DBに1行追記」/「新しい別企業◯◯でレポート生成」/「抽出値の自動QAチェックリストを実装」】
運用ルールは docs/OPERATIONS.md と CLAUDE.md を正とし、外部送信・実投稿は必ず承認を取ってから。
```

---

## 1. いまどこまで進んだか

| 案件 | 状態 |
|---|---|
| **REVECAREERAGENCY 2026/06**（TikTok @kurosaki_shacho） | ✅ 本番完了。全15枚 生成・PDF検証済み |
| **TECNES 2026/06**（別企業ドライラン） | ✅ 充填完了。命名規則が全く違う他社でも同じ仕組みで通ることを実証 |
| 仕組みの汎用化 | ✅ 完了。変えるのは `report_data.json` だけ。テンプレ/スクリプトは全社共通 |
| Notion マニュアル | ✅ 作成済み（下表 ID 参照） |

**このセッションで仕組みに追加した改良:**
- `Code.gs` の `render_` を拡張 → **提出フォルダに既存デッキがあれば、それを直接上書き**（運用者が出力デッキを事前命名して置ける。無ければ従来どおりテンプレ複製）。
- `OPERATOR_GUIDE.md` / Notionマニュアルに **他社展開の実地知見**（命名不問・空PNGはビジョン読取・スパース時は推定せず空欄）を追記。

**2026-08-07 セッションの追加分（ブランチ `claude/report-generator-handoff-w82m62`）:**
- `qa_check.py` — **自動QAチェックリスト実装完了**（次の一手 2.）。ERROR/要確認/TODO の3段階で
  「@ハンドル未設定・累計投稿数が空・桁誤読/符号反転疑い・表の列数不一致・提出前TODO残り」を検知。
  TECNESサンプルで §6 の残手当てを正しく検出することを確認済み。終了コードでCI連携可。
- `notion_row.py` — **Notion一覧DB追記の準備実装**（次の一手 1. の前半）。report_data.json から
  クライアント名・対象月・主要KPI・デッキURL・ステータス・QA結果の1行データを生成（ドライラン専用・
  Notionへの書き込みは外部送信ゲートに従い承認後にClaudeがMCPで実行）。**一覧DB自体はまだ未作成**。
- `OPERATOR_GUIDE.md` に Step 2.5（QAチェック）と Step 6（Notion記録）を追記。

---

## 2. 仕組み（責務分担・1枚要約）

```
スクショ ──①抽出(Claude/MCP)──▶ report_data.json（提出フォルダに保存）
        ──②描画(Apps Script)──▶ 既存デッキを上書き or テンプレ複製 → 完成デッキ
        ──③検証(Claude)──▶ デッキをPDF化し全15枚チェック
        ──④手作業──▶ コメント抜粋・グラフ/投稿スクショ貼付（自動化しない方針で確定）
```
- 数値抽出・検証 = Claude（Maxプラン内・追加API費 **¥0**）、描画 = Apps Script（無料）。
- **トークン化不要・位置ベース**：シェイプを `left,top` で特定して直接 setText/表/画像を流し込む（複製でID再採番されても安全）。
- デッキの表はテキスト抽出では見えない → **検証は必ずPDF化**（`download_file_content`(PDF)→`pdftotext`。テキストが0の場合はフォントがアウトライン化＝画像化して目視）。

---

## 3. 実行手順（運用者向け・最短）

1. 対象クライアントの Drive フォルダに **①`report_data.json`** と **②出力先の空デッキ（テンプレ複製をリネームしたもの）** を置く。
2. Apps Script で `generateReportForFolder('<フォルダID>')` を実行。
3. フォルダ内のデッキが**その場で埋まる**（名前は保持）。ログの「生成完了: …」URL を再読み込みで確認。
4. Claude 側でデッキをPDF化 → 全15枚を検証。
5. 手作業でコメント抜粋・グラフ/投稿スクショを貼付して納品。

---

## 4. 成果物（`scripts/report-generator/`）

| ファイル | 役割 |
|---|---|
| `Code.gs` | 位置ベース・レンダラ（全社共通）。`render_` は既存デッキ上書き対応済み |
| `Inspect.gs` | テンプレ構造を `deck_structure.json` に出力（レイアウト変更時のみ） |
| `Watcher.gs` | 5分毎トリガー。`report_data.json` を置くだけで自動生成 |
| `build_report_data.py` | 抽出マスター→report_data 変換（CLI・クライアント非依存） |
| `qa_check.py` | report_data の自動QAチェックリスト（ERROR/要確認/TODO・終了コード連携） |
| `notion_row.py` | Notion一覧DB追記用の1行データ生成（ドライラン専用・書き込みは承認後） |
| `schema/report_data.schema.json` | データ契約 |
| `OPERATOR_GUIDE.md` | チーム共通・多クライアント運用手順（他社展開の知見入り） |
| `SESSION_SUMMARY.md` | REVECAREERAGENCY本番の詳細まとめ |
| `COST_ESTIMATE.md` / `TOKENIZATION_GUIDE.md` | コスト試算 / 方式解説 |
| `samples/REVECAREERAGENCY_2026-06.*.json` | 抽出マスター＋充填データの実例 |

---

## 5. 重要 ID（Drive / Notion）

| 対象 | ID |
|---|---|
| マスターテンプレ（`-マスターデータ`） | `1EHHEVOZTm7GkrU111lU69Nz1x-cwsgMfpu1unaWzazA` |
| REVECAREERAGENCY 完成デッキ（本番） | `1V4gZSGLu-piC772SsHcWrxxWXKQO8j-QD-crNk7O6PE` |
| REVECAREERAGENCY スクショ親フォルダ | `1HAOa5Epvuaqgr_YrQWgNhNlM5VZKulzH` |
| **TECNES 提出フォルダ**（report_data.json＋スクショ12枚） | `148AjCRv-JwcIw0njHLj4B8u75ScHufrP` |
| **TECNES デッキ**（`【分析レポート】TECNES様20260629作成`） | `1Tkl6N78xcSDxkG_03NuLgTHr1-xZ3ZRmPrFQt7cR0pA` |
| Notion マニュアル | `379c57ee1f6081beb06ec6acfa67f58d` |
| Notion 親「🏢 全社マニュアル」 | `340c57ee1f60813db3aafd260c7b207d` |

---

## 6. TECNES の残手当て（提出前）

今回はスクショに無い/スパースな項目を**推定せず空欄**にしてある。提出前にここだけ補う：
1. slide6「累計投稿数」「投稿頻度(月間)」… データに無く `00`/`0` のまま
2. 基本情報の @ハンドル … スクショ未記載のため社名のみ
3. slide10-12「コメントピックアップ」… 実コメント追記
4. グラフ・投稿スクショの貼付（テンプレに画像枠なし＝手貼り）

---

## 7. 次の一手（優先順）

1. **Notion 一覧DBへの自動追記**（最優先・残り半分）— 行データ生成は `notion_row.py` で完了。
   残タスク: ①一覧DBをNotionに作成（プロパティ設計は `notion_row.py` docstring 参照。親は「🏢 全社マニュアル」配下を想定）
   ②承認を得て REVECAREERAGENCY / TECNES の2行を初回追記 ③以降は Step 6 の運用に乗せる。
2. ~~**抽出値の自動QAチェックリスト**~~ — ✅ 完了（`qa_check.py`）。
3. **別企業でのさらなるドライラン** — パース耐性の追加検証。
4. **Web App化** — 5分トリガー待ちを無くし即時生成。

---

## 8. 運用ルール（厳守）

- 外部送信・SNS実投稿・メール送信は**必ず事前承認**（`docs/OPERATIONS.md`）。
- 画像（グラフ・投稿スクショ）の自動貼付は**行わない**（手貼り）。
- 改善案・提案コメントは約2倍量で記述（`CLAUDE.md`「アウトプット作法」）。
- 全作業は `claude/report-generator-handoff-w82m62` で開発・コミット・プッシュ（旧 `claude/wizardly-hopper-tK90k` はマージ済み）。
