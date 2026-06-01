# 一次ソース(JBCA ProSERIES カタログ)

警備Pro提供元(株式会社ビジコン・ジャパン)の公式カタログ。
**全文テキストの要約は `../15_jbca-catalog-findings.md` に保全済み。**

PDF原本は Google Drive 共有フォルダにあり、本リポジトリへの直接ダウンロードは
当セッションの実行環境ネットワークポリシー(`drive.google.com` への直アクセスが 403)により取得できませんでした。
認証済み環境/ローカルで `fetch-catalogs.sh` を実行すると原本を取得できます。

## ファイル一覧(Drive)

| ファイル | サイズ | Drive File ID | 閲覧URL |
|---------|--------|---------------|---------|
| 警備Proカタログ.pdf | ~1.29MB | `1IasHkyyZ0nI6aR9-Te2yPcUayRYWGYmq` | https://drive.google.com/file/d/1IasHkyyZ0nI6aR9-Te2yPcUayRYWGYmq/view |
| 管制Proカタログ.pdf | ~1.29MB | `1srf4Xl-yfUscR0joa6_mbtWn2MaNStcc` | https://drive.google.com/file/d/1srf4Xl-yfUscR0joa6_mbtWn2MaNStcc/view |
| 教育Proカタログ.pdf | ~0.72MB | `1wWu0CVPS-_5evpJg9exfqYfnMZSQneFm` | https://drive.google.com/file/d/1wWu0CVPS-_5evpJg9exfqYfnMZSQneFm/view |
| ProSERIESカタログ.pdf | ~1.58MB | `1YD5wPKsgvOMSm6fQ-5LJR5I1V6iDK1-I` | https://drive.google.com/file/d/1YD5wPKsgvOMSm6fQ-5LJR5I1V6iDK1-I/view |
| JBCAアシスタントProカタログ.pdf | ~0.83MB | `188m-F8zVLxIrhj-_nFSiOU2BICgz2EFX` | https://drive.google.com/file/d/188m-F8zVLxIrhj-_nFSiOU2BICgz2EFX/view |

- 親フォルダ: https://drive.google.com/drive/folders/1Rl9Rwv8-pjyiX7PmzP7KJwj9o-pILi2y
- サブフォルダ「警備Pro 資料」: `1NUlXcNZQLdF7z-u2AjpXWs7SX39xaDVO`

## 取得方法

```bash
# 方法A: gdown(共有リンクが「リンクを知る全員」の場合)
pip install gdown
bash fetch-catalogs.sh

# 方法B: Google Drive API / 認証済み rclone 等でフォルダごと取得
#   rclone copy "gdrive:警備Pro 資料" ./
```

> 注:これらは第三者(ビジコン・ジャパン)の著作物です。社内検討の参考資料としての保管に留め、再配布しないでください。
