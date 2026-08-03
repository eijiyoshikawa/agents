# セッションまとめ / ハンドオフ（SNS分析レポート自動生成）

最終更新: 2026-06-15 / ブランチ: `claude/wizardly-hopper-tK90k`

> **新セッションの引き継ぎは `HANDOFF.md` を先に読むこと。**
> 本ファイルは REVECAREERAGENCY 本番の詳細記録。
> その後 TECNES 2026/06 の別企業ドライランが完了し、`render_` は「フォルダ内の既存デッキを直接上書き」に対応済み（詳細は `HANDOFF.md`）。

## 1. 達成したこと（このセッションの成果）
クライアントの採用SNS（TikTok）運用スクショ → **Google Slides 15枚の月次分析レポート**を
半自動生成する仕組みを構築し、実データ（REVECAREERAGENCY 2026年6月）で**全15枚の生成・検証まで完了**。
さらに「**誰でも・他社でも**」回せるよう汎用化し、Notionにマニュアルを作成した。

## 2. 仕組み（責務分担）
```
スクショ ──①抽出(Claude/MCP)──▶ extraction_master.json / report_data.json（フォルダ保存）
        ──②描画(Apps Script)──▶ テンプレ複製に自動充填 → 完成デッキ
        ──③検証(Claude)──▶ デッキをPDF化し全15枚チェック
        ──④手作業──▶ コメント抜粋・グラフ/投稿スクショ貼付（※自動化しない方針で確定）
```
- 数値抽出・検証=Claude（Max内・追加API費¥0）、描画=Apps Script（無料）。
- 変わるのは**データ(report_data.json)だけ**。テンプレ・スクリプトは全クライアント共通。

## 3. 方式の要点
- **トークン化不要・位置ベース**：シェイプを `left,top` で特定して直接 setText/表/画像を流し込む（複製でID再採番されても安全）。
- 位置マップは `Inspect.gs` が出力する `deck_structure.json`（全15枚）を基に `Code.gs` に確定済み。
- デッキの表はテキスト抽出では見えない → **検証は必ずPDF化**（`download_file_content`→`pdftotext`）。

## 4. 成果物（リポジトリ `scripts/report-generator/`）
| ファイル | 役割 |
|---|---|
| `Code.gs` | 位置ベース・レンダラ（全クライアント共通） |
| `Inspect.gs` | テンプレ構造を `deck_structure.json` に出力（レイアウト変更時のみ） |
| `Watcher.gs` | 5分毎トリガー。`report_data.json` を置くだけで自動生成（`.report_generated` で重複防止） |
| `build_report_data.py` | 抽出マスター→report_data 変換（CLI・クライアント非依存。account数値を自動導出） |
| `schema/report_data.schema.json` | データ契約 |
| `OPERATOR_GUIDE.md` | チーム共通・多クライアント運用手順 |
| `COST_ESTIMATE.md` | コスト試算 |
| `samples/REVECAREERAGENCY_2026-06.extraction_master.json` | 全71投稿＋4期間概要＋オーディエンス属性の生データ |
| `samples/REVECAREERAGENCY_2026-06.report_data.json` | 充填データ実例 |

## 5. 重要な Drive / Notion ID
| 対象 | ID |
|---|---|
| マスターテンプレ（`-マスターデータ`） | `1EHHEVOZTm7GkrU111lU69Nz1x-cwsgMfpu1unaWzazA` |
| 構造ダンプ `deck_structure.json` | `1q2zWwP0sngKMMquT86cWswY3AOGIp76c` |
| 充填データ最新 `report_data_v3.json` | `1QWvPOzwP0QiDmtbK_2pYBKEolGejZVFm` |
| 完成デッキ（最終確認済み） | `1V4gZSGLu-piC772SsHcWrxxWXKQO8j-QD-crNk7O6PE` |
| 元スクショ親フォルダ（2026/06提出分） | `1HAOa5Epvuaqgr_YrQWgNhNlM5VZKulzH` |
| 投稿別インサイト フォルダ | `1Eba_xgjl2tMdDpYOYZ73R6ihF7SGHxc8` |
| Notion マニュアル（作成済み） | `379c57ee1f6081beb06ec6acfa67f58d` |
| Notion 親「🏢 全社マニュアル」 | `340c57ee1f60813db3aafd260c7b207d` |

## 6. 実データ要点（REVECAREERAGENCY / TikTok @kurosaki_shacho）
- 28日: 動画視聴 203,451(+139%)・PF 7,212(+135%)・フォロワー 7,790(+117%)・いいね 2,828・シェア 35・コメント 79
- 年間(365日): 再生 390万・新規フォロワー 8,474
- バズTOP3: #23 ちゃん付けドッキリ(1.1M)／#55 これ今は何て言う(866.8K)／#14 社長に1日密着(271.3K)
- 勝ち筋: ドッキリ/社長密着（リーチ・PF牽引）＞ ロゴ/シルエットクイズ（完了率・保存）＞ 相談/Tips（採用関連エンゲージ）
- オーディエンス: 男性83〜88%、45-54歳が最多、日本82〜90%

## 7. コスト
1本あたり実質 **約¥2,500（人作業45分・追加API/ツール費¥0）**、従来手作業比 **約70〜75%削減**。

## 8. 確定した運用方針
- 画像（グラフ・投稿スクショ）の自動貼り付けは**行わない**（手貼りのまま）。
- 改善案・提案コメントは約2倍量で記述（`CLAUDE.md`「アウトプット作法」に明記）。

## 9. 残作業（手作業）
1. slide10-12「コメントピックアップ」の実コメント追記
2. グラフ画像・各投稿スクショの貼付

## 10. 次の候補（未着手）
- **別企業でのドライラン**（命名ゆれ・投稿数差・桁差の実地検証 → パース耐性と手順書を補強）
- Notion一覧DBへの自動追記（管理・過去比較の自動化）
- 抽出値の自動QA（桁誤読・符号反転の検出）
- Web App化（5分待ちを無くし即時生成）
