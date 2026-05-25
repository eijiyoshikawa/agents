# Google Sheets 集計用 QUERY 関数集

> LET 採用広告集計シート用の即コピペ関数集
> 適用: `data_pipeline_let.md` Phase 1 の集計レイヤ

## シート構成（再掲）

```
LET 採用広告集計 2026Q2
├ Tab1: ad_daily_raw      (媒体エクスポートCSV貼付)
├ Tab2: applications      (Notion DB からCSV同期)
└ Tab3: creative_scores   (QUERY関数で自動集計)
```

## Tab1: ad_daily_raw のカラム定義

A列から順に:

| 列 | キー | データ型 | 例 |
|---|---|---|---|
| A | date | YYYY-MM-DD | 2026-06-03 |
| B | media | text | meta / tt / line |
| C | campaign | text | meta_eigyo_osaka-city_cv_202606_001 |
| D | adset | text | smart-audience_h1-salary_m |
| E | ad | text | ugc_c001_a |
| F | exp_id | text | EXP-20260525-001 |
| G | lp_id | text | lp-a |
| H | hook_id | text | H1 / H2 / H3 / H5 / H6 / H7 |
| I | crtv_format | text | F1-UGC / F2-Text / F3-Static |
| J | imp | number | 5000 |
| K | reach | number | 4200 |
| L | freq | number | 1.19 |
| M | click | number | 80 |
| N | ctr | number (%) | 1.6 |
| O | cpc | number | 60 |
| P | cost | number | 4800 |
| Q | video_views_3s | number | 1200 |
| R | hook_rate_3s | number (%) | 24.0 |
| S | save | number | 5 |
| T | share | number | 2 |
| U | comment | number | 3 |

媒体側のCSVエクスポートには `hook_id` / `crtv_format` / `lp_id` 列が無いので、**Ad名から関数で抽出**:

```excel
# H列 hook_id を Ad名から抽出（例: ugc_c001_a → H1）
# Ad名規則的にはAdSet名から取った方が確実。ここでは AdSet名(D列)から抽出
=IFERROR(REGEXEXTRACT(D2,"h(\d)-")*1,"")
# → "h1-salary" から 1 抽出 → "H" & 1 = "H1"

# 完全版
=IF(REGEXMATCH(D2,"h\d-"), "H"&REGEXEXTRACT(D2,"h(\d)-"), "")

# I列 crtv_format を Ad名から
=IFERROR(SWITCH(LEFT(E2,3),
  "ugc","F1-UGC",
  "tex","F2-Text",
  "sta","F3-Static",
  "F1-UGC"),"")

# G列 lp_id は UTM側で付けたものを別途記入 or Ad名末尾から導出
# Sprint 1 では訴求軸→LP マッピングが固定: H1/H3/H5/H7→LP-A, H2/H6→LP-B
=IF(OR(H2="H2",H2="H6"),"lp-b","lp-a")

# N列 ctr の自動計算
=IF(J2>0,M2/J2*100,0)

# O列 cpc の自動計算
=IF(M2>0,P2/M2,0)

# R列 hook_rate_3s（TikTok のみ）
=IF(J2>0,Q2/J2*100,0)
```

## Tab2: applications のカラム定義

Notion CSV エクスポートをそのまま貼付できる形式（Notion DB 設計と一致）。

```csv
応募者ID,応募日時,応募者氏名,年齢,性別,前職業種,前職職種,法人営業経験年数,流入元LP,流入元LINE追加URL,媒体推定,Campaign名,Ad名,AdSet名,EXP-ID,訴求軸,形式,応募チャネル,ステータス,連絡到達,面談実施日,1次面接日,最終面接日,内定日,採用日,90日定着,辞退理由,LINEトーク履歴URL,担当者,備考
```

## Tab3: creative_scores（QUERY 関数で自動生成）

### CRTV別 7日間集計

セルA1 に貼付:

```excel
=QUERY(ad_daily_raw!A:U,
  "SELECT E, I, H, G, SUM(J), SUM(M), SUM(P), SUM(M)/SUM(J)*100, SUM(P)/SUM(M), SUM(Q)/SUM(J)*100
   WHERE A >= date '" & TEXT(TODAY()-7,"yyyy-mm-dd") & "'
   GROUP BY E, I, H, G
   ORDER BY SUM(M)/SUM(J) DESC
   LABEL E 'Ad', I 'Format', H 'Hook', G 'LP', SUM(J) 'Imp', SUM(M) 'Click', SUM(P) 'Cost', SUM(M)/SUM(J)*100 'CTR%', SUM(P)/SUM(M) 'CPC', SUM(Q)/SUM(J)*100 'Hook%'
   FORMAT SUM(M)/SUM(J)*100 '0.00', SUM(P)/SUM(M) '0', SUM(Q)/SUM(J)*100 '0.0'",
  1)
```

### 訴求軸別 集計

別シートまたは別範囲（例: A20）に:

```excel
=QUERY(ad_daily_raw!A:U,
  "SELECT H, COUNT(E), SUM(J), SUM(M), SUM(P), SUM(M)/SUM(J)*100, SUM(P)/SUM(M)
   WHERE A >= date '" & TEXT(TODAY()-7,"yyyy-mm-dd") & "' AND H IS NOT NULL
   GROUP BY H
   ORDER BY SUM(M)/SUM(J) DESC
   LABEL H 'Hook', COUNT(E) 'CRTV数', SUM(J) 'Imp', SUM(M) 'Click', SUM(P) 'Cost', SUM(M)/SUM(J)*100 'CTR%', SUM(P)/SUM(M) 'CPC'",
  1)
```

### 形式別 集計

```excel
=QUERY(ad_daily_raw!A:U,
  "SELECT I, COUNT(E), SUM(J), SUM(M), SUM(P), SUM(M)/SUM(J)*100, AVG(Q)/AVG(J)*100
   WHERE A >= date '" & TEXT(TODAY()-7,"yyyy-mm-dd") & "' AND I IS NOT NULL
   GROUP BY I
   LABEL I 'Format', COUNT(E) 'CRTV数', SUM(J) 'Imp', SUM(M) 'Click', SUM(P) 'Cost', SUM(M)/SUM(J)*100 'CTR%', AVG(Q)/AVG(J)*100 'AvgHook%'",
  1)
```

### LP別 比較

```excel
=QUERY(ad_daily_raw!A:U,
  "SELECT G, COUNT(E), SUM(J), SUM(M), SUM(P), SUM(M)/SUM(J)*100
   WHERE A >= date '" & TEXT(TODAY()-7,"yyyy-mm-dd") & "' AND G IS NOT NULL
   GROUP BY G
   LABEL G 'LP', COUNT(E) 'CRTV数', SUM(J) 'Imp', SUM(M) 'Click', SUM(P) 'Cost', SUM(M)/SUM(J)*100 'CTR%'",
  1)
```

## Tab4 ファネル集計（新規追加推奨）

### 媒体×ファネル

```excel
=QUERY({
  ARRAYFORMULA(ad_daily_raw!B2:B&""),
  ad_daily_raw!J2:J,
  ad_daily_raw!M2:M,
  ad_daily_raw!P2:P
},
"SELECT Col1, SUM(Col2), SUM(Col3), SUM(Col4)
 WHERE Col1 != ''
 GROUP BY Col1
 LABEL Col1 'Media', SUM(Col2) 'Imp', SUM(Col3) 'Click', SUM(Col4) 'Cost'",
1)
```

### 応募ファネル（Tab2 applications を集計）

```excel
=QUERY(applications!A:AD,
  "SELECT O, COUNT(A), SUM(IF(T='TRUE',1,0)), SUM(IF(Y IS NOT NULL,1,0))
   WHERE O != ''
   GROUP BY O
   LABEL O 'EXP-ID', COUNT(A) '応募数', SUM(IF(T=''TRUE'',1,0)) '連絡到達', SUM(IF(Y IS NOT NULL,1,0)) '採用'",
  1)
```

## アラート用条件付き書式

### CTR が前週平均の50%以下 → 赤色

`ad_daily_raw` の N列（CTR）に対し:

```
書式ルール: カスタム数式
=$N2 < AVERAGE($N:$N)*0.5
書式: 背景色 赤
```

### CPA が予算の2倍超 → 赤色

`creative_scores` の CPA 列に対し:

```
書式ルール: カスタム数式
=$I2 > 12000   # 法人セールス想定CPA 6000 × 2
書式: 背景色 赤
```

## 日次運用 GAS スクリプト（任意）

毎日朝8時に creative_scores を自動更新 + Slack通知（Apps Script）:

```javascript
function dailySprintReport() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('creative_scores');
  const data = sheet.getDataRange().getValues();
  
  // 直近24時間のTop3 CRTV を抽出
  const topCrtv = data.slice(1).sort((a,b) => b[7] - a[7]).slice(0,3);
  
  const msg = `🌅 LET 採用広告 日次レポート\n` +
              `Top 3 CRTV (CTR順):\n` +
              topCrtv.map((row,i) => `${i+1}. ${row[0]} (${row[2]}) CTR ${row[7]}%`).join('\n');
  
  // Slack Webhook URL（Properties に格納）
  const slackUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK');
  UrlFetchApp.fetch(slackUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: msg })
  });
}

// Trigger: 毎日 8:00 に dailySprintReport を実行
```

## Looker Studio 接続後の主要メトリック

### Calculated Field 例

```
# CTR
SUM(click) / SUM(imp) * 100

# CPA
SUM(cost) / SUM(applications)

# Hook率
SUM(video_views_3s) / SUM(imp) * 100

# 採用率
SUM(hires) / SUM(applications) * 100
```

## ガバナンス

- シート共有: 関係者のみ閲覧/編集
- PII（応募者氏名）を扱うため、`applications` タブのみ別シートに分離も検討
- 月次でバックアップ（ダウンロード → ローカル保存）
