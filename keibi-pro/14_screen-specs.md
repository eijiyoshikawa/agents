# 14. 画面別 項目 / バリデーション / API 定義

`13`(ワイヤー)を実装仕様に落とす。主要画面ごとに「入力項目・バリデーション・API」を定義。
API は REST 想定の暫定。`12` のスキーマ・`05` のルールと整合。

> 凡例:R=必須、auth=要権限(`09`)。日時はISO8601、金額はint(円)。

---

## 共通

- 認証:Bearer(セッション)。全API `tenantId` をサーバ側で解決(クライアント送信不可)。
- 支店スコープ:`branchId` クエリ。ロールで許可支店を制限。
- エラー:`{ code, message, fields?[] }`。バリデーションは400で field 単位。
- 一覧API:`?page&size&sort&filter`。
- 監査:金額・単価・給与の変更/閲覧は AuditLog 記録。

---

## A. 配置ボード `/dispatch`(中核)

### 取得
`GET /api/dispatch?date&branchId`
→ 現場行(受注必要数 + 割当)を返す。
```jsonc
{ "date":"2026-06-01",
  "rows":[{
    "siteId","clientName","siteName","workTypeId","workTypeName",
    "required":6, "assigned":5,
    "assignments":[{"assignmentId","guardId","guardName","status"}],
    "status":"open" // 行集約ステータス
  }],
  "counters":{"guards":113,"dayoff":0,"available":113,"orders":46,"assigned":44,"open":2}
}
```

### 隊員ピッカー
`GET /api/guards/pickable?date&branchId&qualId?&categoryId?&q?&onlyFree?&allowNegotiable?`
→ 各隊員に `currentAssignment?`(配置済=赤)、`dayoff`(休/△)を付与。

### 割当・解除
`POST /api/assignments` body:`{date,siteId,workTypeId,guardId,slotNo}`
- **バリデーション**:
  - R: date/siteId/workTypeId/guardId
  - **同配置NG**:同日同現場にNG関係 → `409 NG_PAIR`(`{ngGuardName, note}` 返却)→ UIで「配置する/キャンセル/詳細」。`force=true` で上書き登録(理由を監査)。
  - **二重配置**:同日同枠に既存 → `409 DUP`。同隊員が同時間帯別現場 → `warn`(配置は可、警告表示)。
  - 休日(休)→ `warn`(交渉△は可)。
  - 資格要件あり&無資格 → `warn`。
  - クレーム再配置区分=不可/得意先不可 → `warn`/`block`。
`DELETE /api/assignments/:id`(解除)

### ステータス遷移
`PATCH /api/assignments/:id/status` body:`{status}` (`assigned→notified→departed→unconfirmed→actual`)
- 不正遷移は400。`actual` 化で Attendance を起票(なければ生成)。

---

## B. 勤務実績グリッド `/timesheets`

### 取得
`GET /api/attendances?date&branchId&view=all|site|guard|client&filter`
→ 行配列。`view` は並び替え/グルーピングのみ(同一データ)。

### 行 入力項目
| 項目 | 必須 | バリデーション |
|------|------|---------------|
| siteId / workTypeId / guardId | R | 存在・支店一致 |
| reportStart / reportEnd | R | HH:mm、跨日(夜勤22:00→翌05:00)を許容 |
| billingPct / payPct | R | 0〜2.0 |
| breakMin / overtime / early / late / dayOt | | ≧0 |
| transportFee 等 付帯費用 | | ≧0 int |
| rateOverrides | | `{item: {mode:"master"|"override", amount}}`。mode=master は amount 無視(`05`§1) |

### 保存
`PUT /api/attendances/:id` / `POST /api/attendances`(新規行)
- actualH/billingH/payH はサーバ計算(report-base から残業・深夜按分)。
- 締め済(billingSummary/payroll 紐付き)行の編集は `409 LOCKED`(再集計フロー誘導)。

### 単価詳細・一括
- `GET /api/attendances/:id/rates` → マスタ単価 vs 上書きを返す。
- `POST /api/rates/bulk` body:`{scope:"billing"|"pay", period, siteId?|guardId?, workTypeId?, items[]}` → 期間一括更新。

### 時間一括セット
`POST /api/attendances/bulk-time` body:`{ids[], start, end, mode:"base"|"report"}`

### 日報写真
`GET /api/attendances/:id/photos` → Drive参照(プレビューURL/サムネ)。

---

## C. 日報提出(モバイル)`/m/report`

### フォーム項目
| 項目 | 必須 | 補足 |
|------|------|------|
| date | R | 既定=当日 |
| siteId | R | 当日自分の配置をサジェスト |
| reportStart / reportEnd | R | 「今すぐ」打刻ボタン |
| breakMin | | |
| weather | | 天候マスタ |
| notes / incident | | incident=true でエスカレーション通知 |
| **photos[]** | **R(1枚以上)** | 現場サイン紙。自動圧縮 |
| transportFee + receipt | | 任意 |
| gpsPoint | | 同意時のみ |

### 送信
`POST /api/daily-reports`(multipart)
- サーバ処理:
  1. 配置(date+site+guard)とマッチング → Attendance 起票/更新。
  2. 写真を **Google Drive** へ転送(`08` のフォルダ規約/命名)→ ReportPhoto に driveFileId 保存。
  3. status=submitted。承認待ちへ。
- **オフライン**:クライアントはキュー保持し再送。冪等キー(`clientReportId`)で二重登録防止。
- レスポンス:保存/未送信状態、Drive保存可否。

### 承認(内勤)
`POST /api/daily-reports/:id/approve` / `:id/reject{reason}`(auth: dispatcher/admin)
- 一括承認:`POST /api/daily-reports/approve-batch {ids[]}`。

---

## D. シフト希望(モバイル)`/m/shift`

`POST /api/shift-requests` body:`{targetPeriod, availableDates[], ngDates[], preferredSites[], maxConsecutive, note}`
- → 休日登録・配置ボードへ候補/制約反映。提出期限リマインド通知。

---

## E. 請求ウィザード `/billing`(auth: accounting/admin)

### ① 締め対象
`GET /api/billing/targets?ym&closingDay&periodStart&periodEnd&branchId&clientId?&siteId?`
→ 現場ごとの status(draft/aggregated/closed)。
`POST /api/billing/aggregate` body:`{targetIds[]}` → 実績集計→BillingSummary 生成/更新(冪等)。
- 月極現場:契約月額で基本行生成。スポット:実績から明細生成(`05`§3-1)。

### ② 明細調整
`GET /api/billing/:summaryId` / `PATCH`(値引き等)
`POST /api/billing/:summaryId/additional` body:`{date,name,qty,unitPrice,taxRate,taxable}`(追加請求/キャンセル料)
- **キャンセル料補助**:`POST /api/billing/:summaryId/cancel-fee` body:`{canceledAt, baseAmount}` → cancelPolicy から提案額算出(確定は手動、`05`§3-2)。

### ③ 発行
`POST /api/billing/:summaryId/issue` body:`{template, options}` → invoiceNo採番・PDF生成。
`GET /api/billing/print?clientId&ym&template` → 得意先別請求書(現場束ね)。
- バリデーション:status=aggregated 必須、税計算(外税/内税・端数・軽減税率)整合。

---

## F. 入金 / 売掛 `/payments`(auth: accounting/admin)

`GET /api/payments?scheduledFrom&to&unallocatedOnly`
`POST /api/payments` / `PATCH /api/payments/:id`
`POST /api/payments/:id/allocate` body:`{allocations:[{summaryId, amount}]}`
- バリデーション:配賦合計 ≦ 入金額。請求額=配賦合計で消込完了(青字フラグ)。

---

## G. 給与ウィザード `/payroll`(auth: accounting/admin。給与額はマスク対象)

### ① 集計
`GET /api/payroll/targets?payForm&periodStart&periodEnd&branchId&guardId?`
`POST /api/payroll/aggregate` body:`{guardIds[], options:{recalcAll,calcResidentTax,calcSocialIns,includeFixedPay,includeFixedDeduction,importYearEnd}}`
- 介護保険:guard 年齢≧40 で計上。社保・所得税・住民税はオプションで再計算。

### ② 明細
`GET /api/payroll/:id` → 支給(基本給/手当)・控除(税/社保/固定)・netPay。
`POST /api/payroll/:id/recalc-tax` / `:id/recalc`
`PATCH /api/payroll/:id`(手当・控除の手修正、auth厳格)

### ③ 確定・出力
`POST /api/payroll/:id/confirm`(確定後ロック)
`GET /api/payroll/:id/payslip.pdf`
`POST /api/payroll/bank-transfer` body:`{periodStart,periodEnd,bankFormat}` → 全銀データ生成。

---

## H. 帳票センター `/reports`

`GET /api/reports/:type/preview?params` / `POST /api/reports/:type/export {format:"pdf"|"xlsx", template, saveToDrive?}`
- type:御請求書/配置先別明細/作業員名簿(様式5号)/警備契約書(1号·2号)/管制日報/賃金台帳/売上収支表。
- `saveToDrive=true` で Drive 保管も実行。
- 作業員名簿オプション:社保情報/建退共/建設産業用/緊急連絡先非表示 等。

---

## I. マスタ(代表)

- `GET/POST/PUT /api/clients`, `/api/clients/:id/sites`(配置先+締め+単価), `/api/guards`(多タブ:給与/振込/社保/住民税/固定/資格/NG/有給/クレーム), `/api/work-types`, `/api/contracts` 等。
- 配置先の請求単価、隊員の給与単価はサブリソース(`/sites/:id/rates`, `/guards/:id/rates`)。

---

## バリデーション横断ルール(再掲・`05`)

- 単価 mode=master は金額入力不要(「0=マスタ参照」をUIで撤廃)。
- 締め済データの編集はロック→再集計フロー。
- 同配置NGは force+理由で上書き可(監査)。
- 跨日勤務の深夜時間・実働Hはサーバ按分。
- インボイス:発行時に登録番号・税率別記載を必須チェック。
