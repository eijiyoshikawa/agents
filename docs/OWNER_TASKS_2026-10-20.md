# オーナー作業の手順書（2026-10-20 時点）

引き継ぎメモ `docs/HUB_HANDOVER_2026-10-20.md` の「残っている作業」のうち、オーナーが行う 7 件の具体的な手順。
各項目の末尾に「次のセッションに頼めること」を書いてある。頼む場合はその一文をそのまま伝えればよい。

| # | 作業 | 所要 | 影響 |
|---|---|---|---|
| 1 | 評価制度サイトの共通ログイン有効化（DNS + 鍵） | 15 分 | 鍵を作り直す場合は全員がハブに再ログイン |
| 2 | ハブのメンバー登録・初期パスワード配布 | 1 人 3 分 | なし |
| 3 | 4 リポジトリの main マージ | 15 分 | 本番は変わらない（既に作業ブランチが本番） |
| 4 | Vercel の let-hyoka プロジェクト削除 | 2 分 | なし（評価サイトは agents プロジェクト） |
| 5 | 要件書 10 章の未確定値の入力 | 10 分 | 判定の基準が変わる |
| 6 | CRON_SECRET 等のローテーション | 20 分 | 財務の旧ログイン（合言葉）が無効に |
| 7 | Notion「吉川 英二」の確認 | 2 分 | なし |

---

## 1. 評価制度サイトの共通ログイン有効化

コードは実装・本番反映済み（`outputs/evaluation_criteria/middleware.js`）。`let-hyoka.vercel.app` は従来どおりパスワードで開ける。
`hyoka.let-inc.net` で開けるようにするには、DNS と鍵の 2 つが要る。

### 1-A. Xserver の DNS に CNAME を追加

1. Xserver サーバーパネル → 「ドメイン」→「DNS レコード設定」→ `let-inc.net` を選択
2. 「DNS レコード追加」タブで次を入力して「確認画面へ進む」→「追加する」

| 項目 | 値 |
|---|---|
| ホスト名 | `hyoka` |
| 種別 | `CNAME` |
| 内容 | `cname.vercel-dns.com` |
| 優先度 | `0`（そのまま） |

3. 既に `hyoka` の A レコードがある場合は先に削除する（今は `*.let-inc.net` のワイルドカード A レコード 202.254.234.133 に向いている。CNAME を足せばそちらが優先される）
4. 反映確認: Vercel → `eijiyoshikawa's projects` → `agents` → Settings → Domains → `hyoka.let-inc.net` が「Valid Configuration」になる（数分〜1 時間）。sales / jinji / finance と同じ手順

### 1-B. `agents` プロジェクトに `HUB_SESSION_SECRET` を入れる

ハブ（let-hub）と**同じ値**でないと 503 になる。値は Sensitive で読み出せないので、分かる場合と分からない場合で手順が違う。

**値が手元にある場合**（前回の作業メモ等）

1. Vercel → `eijiyoshikawa's projects` → `agents` → Settings → Environment Variables
2. 「Add New」: Key `HUB_SESSION_SECRET`、Value に値を貼る、Environments は Production と Preview、「Sensitive」をオン → Save
3. Deployments → 一番上の Production のデプロイ右端「…」→ Redeploy（「Use existing Build Cache」はオフ）

**値が分からない場合（作り直し。全員がハブに再ログインになる）**

1. 手元のターミナルで新しい値を作る: `openssl rand -base64 32`
2. 次の 6 プロジェクトで `HUB_SESSION_SECRET` を同じ値に差し替える
   - `eijiyoshikawa's projects`: `let-hub` / `sales-cockpit` / `jinji-l-system` / `slack-let` / `agents`
   - `LET` チーム: `masterai`
   - 手順: Settings → Environment Variables → `HUB_SESSION_SECRET` の行の「…」→ Edit → Value を貼る（`agents` だけは無いので Add New）→ Save
3. 6 プロジェクトすべてを Redeploy（Deployments → 最新の Production → … → Redeploy）
4. 確認: hub.let-inc.net にログインし直し、営業コックピット・人材紹介・財務・案件 KPI のカードがログイン画面なしで開く

### 1-C. ハブのカードを新ドメインに切り替える

`hub/config/dashboards.json` は `hyoka.let-inc.net` に変更済み（作業ブランチ）。let-hub の本番に反映するには、作業ブランチを let-hub に再デプロイする（1-A・1-B が終わってから）。
- Vercel → `let-hub` → Deployments → 右上「Create Deployment」→ ブランチ `claude/epic-babbage-p7cudc` → Deploy。または main マージ後（3.）に自動デプロイ
- 急がない場合: ハブの環境変数 `HUB_URL_HYOKA=https://hyoka.let-inc.net/` を追加して Redeploy でも同じ

### 1-D. 動作確認と後片付け

- 役員でハブにログイン → 「評価制度サイト」カード → `hyoka.let-inc.net` がパスワード入力なしで開く（経営陣 4 ページとも）
- 役員以外のメンバーで開くと「役員専用ページです」（403）
- `agents` プロジェクトの環境変数 `DELETE_ME_TEST_HYOKA_PROTECT` / `DELETE_ME_TEST_HUB_SESSION_SECRET` / `DELETE_ME_TEST_HYOKA_EXEC_PASSWORD` の 3 件は検証の残骸。Settings → Environment Variables で削除してよい

**次のセッションに頼めること**: 「共通ログインの鍵を作り直して 6 プロジェクトに入れて再デプロイして」「ハブを作業ブランチで再デプロイして」。DNS だけは Xserver の操作なので代行できない。

---

## 2. ハブのメンバー登録・初期パスワード配布

### 2-A. 役員以外（運用担当・セールス）を登録する

1. 役員で https://hub.let-inc.net にログイン → 右上「メンバー管理」（または https://hub.let-inc.net/admin/members ）
2. 「メンバーを追加」に入力
   - メール: 本人の会社メール（小文字）。**運用管理（/ops）を使う人は masterAI 側も同じメールで登録する**（2-B）
   - 氏名
   - 役割: `staff`（一般）/ `manager`（管理職）/ `exec`（役員）。見られるものは次のとおり

| 役割 | 開ける画面 |
|---|---|
| staff | 採用マーケティング運用管理（/ops） |
| manager | 上記 + 案件 KPI・営業コックピット・人材紹介 |
| exec | 上記 + 財務・評価制度サイト・メンバー管理 |

   - 見られる項目: 「役割で見られる項目すべて」か「選んだ項目だけ」（例: セールスには営業コックピットと /ops だけ）
3. 「追加して初期パスワードを発行」→ 画面に初期パスワードが **1 回だけ** 表示される。閉じると再表示できない（再発行は可能）
4. 本人に伝える。Slack やメールに平文で残さない（口頭、電話、パスワードマネージャーの共有、または Slack DM で送って本人が控えたら両方とも削除）
5. 本人は hub.let-inc.net にメール＋初期パスワードでログイン → パスワード変更を求められる → 変更後に各ダッシュボードへ入れる（変更が終わるまで共通ログインは発行されない）
6. 退職・異動は同じ画面の「無効化」。パスワードを忘れたら「編集」→「パスワードを再発行」

### 2-B. 運用管理（/ops）を使う人は masterAI にも登録

1. https://kpi.let-inc.net/ops/staff を開く（ハブにログイン済みなら入れる）
2. メール（ハブと同じ）・氏名・役割（セールス／運用担当／戦略責任者）を入力して追加
3. これで /ops の担当者ダッシュボードや案件の担当者として選べる

### 2-C. 役員 2 名への初期パスワード配布

役員（`hub/config/members.json` の 3 名: 吉田 翔太、吉川 英治 ×2 メール）のパスワードは環境変数 `HUB_PASSWORD_HASHES` に入っている。前回のセッションで作った初期パスワードのメモ（scratchpad）はそのセッションと一緒に消えているので、**本人が分からない場合は作り直す**。

1. 手元で `agents` リポジトリを開き、`cd hub && node scripts/hash-password.mjs <メール>` → パスワードを対話入力（画面にも履歴にも残らない）→ `{"<メール>":"scrypt$..."}` が出力される
2. Vercel → `let-hub` → Settings → Environment Variables → `HUB_PASSWORD_HASHES` → Edit → JSON の該当メールの値を差し替える（JSON オブジェクト 1 つ。例 `{"a@let-inc.net":"scrypt$...","b@let-inc.net":"scrypt$..."}`）→ Save
3. `let-hub` を Redeploy
4. 本人に 2-A の 4 と同じ方法で伝える。伝え終わったら手元のメモを削除

**次のセッションに頼めること**: 「役員 ○○ の初期パスワードを作り直して」（セッションは値をチャットに出す必要があるので、受け取ったらすぐ本人に渡してチャットを消すこと）。メンバー登録は画面操作が早いので代行不要。

---

## 3. 4 リポジトリの main マージ

### 現状（2026-10-20 夜）

| リポジトリ | 作業ブランチ | main に無いコミット | 衝突 | 備考 |
|---|---|---|---|---|
| eijiyoshikawa/agents | `claude/epic-babbage-p7cudc` | 26 | なし（main は作業ブランチの先祖） | ハブ・営業コックピット・評価サイト・引き継ぎ資料 |
| let-incjp/masterAI | `claude/epic-babbage-p7cudc` | 11 | なし | /ops・CPA・ペルソナ・応募 Webhook・制作物リンク |
| eijiyoshikawa/jinjiLsystem | `claude/epic-babbage-p7cudc` | 0 | — | **マージ済み。作業不要** |
| eijiyoshikawa/slack_let | `claude/epic-babbage-p7cudc` | 1 | なし | ハブ戻りリンクと共通ログイン |

- 本番はすべて作業ブランチの内容で動いているので、マージしても画面は変わらない。マージの効果は「main への別の push で本番が巻き戻らなくなる」こと
- main にマージすると Vercel の GitHub 連携で自動デプロイされる（agents → 評価サイト・let-hub・sales-cockpit、masterai、slack-let）。内容は今の本番と同じ

### 手順（GitHub の画面で PR を作ってマージ）

各リポジトリで次を繰り返す。
1. ブラウザで PR 作成ページを開く
   - agents: https://github.com/eijiyoshikawa/agents/compare/main...claude/epic-babbage-p7cudc
   - masterAI: https://github.com/let-incjp/masterAI/compare/main...claude/epic-babbage-p7cudc
   - slack_let: https://github.com/eijiyoshikawa/slack_let/compare/main...claude/epic-babbage-p7cudc
2. 「Create pull request」→ タイトルはそのまま（例「経営ハブ統合 2026-10-20」）→ 「Create pull request」
3. 「Files changed」で差分をざっと確認（主にハブ・ダッシュボード・docs）
4. CI（agents の `guard-empty-commits`、masterAI の `commit-guard`）が緑になるのを待つ
5. 「Merge pull request」→「Confirm merge」（方式は既定の Create a merge commit でよい）
6. Vercel の該当プロジェクトで main のデプロイが Ready になるのを確認。agents は 3 プロジェクト（agents / let-hub / sales-cockpit）が動く
7. マージ後、作業ブランチは削除してよい（次のセッションは新しいブランチで始める）

**次のセッションに頼めること**: 「3 リポジトリの PR を作って」（マージの確定だけオーナーが押す）。

---

## 4. Vercel の let-hyoka プロジェクト削除

前提の確認（済み）: `let-hyoka.vercel.app` のドメインは **`agents` プロジェクト**に付いている。`let-hyoka` プロジェクトは別物（let-recruit の残骸、ビルド停止済み）なので削除しても評価サイトには影響しない。

1. Vercel → `eijiyoshikawa's projects` → `let-hyoka`（`agents` と間違えないこと）
2. Settings → General → 一番下「Delete Project」
3. 確認欄にプロジェクト名 `let-hyoka` と指示された文言を入力 → Delete
4. 確認: https://let-hyoka.vercel.app が今までどおり開く

**次のセッションに頼めること**: 削除は代行可能だが取り消せないので、オーナー操作を推奨。

---

## 5. 要件書 10 章の未確定値の入力

`masterAI/docs/recruit-marketing-ops-requirements-v0.1.md` 10 章の未確定値のうち、システムに入れる場所があるもの。

1. https://kpi.let-inc.net/ops/settings を開く
2. 「KPI 基準」の次の 3 つに実績から決めた値（%）を入れて「保存」

| 項目 | 画面の欄 | 決め方の目安 |
|---|---|---|
| CTR 基準 | 「CTR 基準（%・要実績確定なら空）」 | 既存案件（TECNES 等）の広告タブの CTR 実績の中央値 |
| LP 到達後の応募率 | 「LP 到達後の応募率（%）」 | 案件の「CPA目標」タブに出る リンククリック→応募 の実績 |
| 応募→面接設定率 | 「応募→面接設定率（%）」 | 応募ファネルタブの 応募→面談設定 の実績 |

   空欄のままでも動く（その判定だけスキップ）。
3. 同じ画面で合わせて見直すもの: 「配信開始 Day」（要件は Day20。承認が遅れる前提なら余裕を足す）、「1 社の月間応募 上限」（25 件）、「工数表」（2 ヶ月実測後に補正）
4. 月額 30 万円のうち広告費に充てる標準値は、案件ごとに「CPA目標」タブの「広告費予算」に入れる（全社標準は未実装。決まったら次のセッションに「CPA目標の既定値に ○万円を入れて」）
5. 広告アカウントの所有（LET 側かクライアント側か）はシステム項目ではなく、ヒアリングフォーム（/ops の案件 → ヒアリング）のメモで運用

**次のセッションに頼めること**: 値が決まっていれば「設定に CTR ○%、LP 応募率 ○%、面接設定率 ○% を入れて」。

---

## 6. `CRON_SECRET` 等のローテーション

共通ログイン導入前に URL や資料に合言葉を貼ったことがあるため、順番に作り直す。**1 つずつ変えて Redeploy し、翌日に Cron が動いたことを確認してから次へ**。

| 秘密 | 場所 | 使われ方 | 変えると起きること |
|---|---|---|---|
| `CRON_SECRET` | `slack-let`（財務） | Vercel Cron（自動で Bearer が付く）＋ 財務画面の旧ログイン（`?token=` → 30 日 Cookie） | 旧ログインの Cookie が無効になる。役員はハブの共通ログインで入れるので支障なし |
| `CRON_SECRET` | `sales-cockpit` | Vercel Cron（/api/sync 等 5 本） | なし（Cron は自動で新しい値を使う） |
| `CRON_SECRET` | `agents`（評価サイト） | **未使用**（静的サイト） | 削除してよい |
| `MK_AGENDA_TRIGGER_KEY` | `masterai` ＋ GitHub `let-incjp/masterAI` の Actions secret | 議事録再生成の手動 URL と GitHub Actions | **両方**を同じ値にしないと Actions が失敗する |
| `RECRUIT_INTAKE_KEY` | `masterai` | 応募 Webhook の合言葉（新設・未設定） | 設定時に LP / Lステップ側にも同じ値 |
| `SHARED_LOGIN_ID` / `SHARED_LOGIN_PASSWORD` | `jinji-l-system` | 人材紹介の旧共通ログイン | 共通ログインに移行後は削除候補（ユーザー登録を済ませてから） |
| `HUB_SESSION_SECRET` | 6 プロジェクト | 共通ログイン | 1-B の手順 |

手順（`CRON_SECRET` の例）
1. 手元で新しい値を作る: `openssl rand -hex 32`
2. Vercel → 該当プロジェクト → Settings → Environment Variables → `CRON_SECRET` → Edit → Value を差し替え → Save
3. Deployments → 最新の Production → … → Redeploy
4. 翌日: Vercel → プロジェクト → Settings → Cron Jobs（または Logs）で直近の実行が成功していることを確認
5. `MK_AGENDA_TRIGGER_KEY` は GitHub → let-incjp/masterAI → Settings → Secrets and variables → Actions → `MK_AGENDA_TRIGGER_KEY` → Update も行う

**次のセッションに頼めること**: 「CRON_SECRET を slack-let と sales-cockpit で作り直して再デプロイして」（値はチャットに出さずに設定できる）。

---

## 7. Notion「吉川 英二」の確認

- 場所: DB_顧客管理 → 「デマント・ジャパン株式会社」 https://app.notion.com/p/303c57ee1f608131a8a9c6267ce98f0a
- 「代表者名」欄が `吉川 英二`。**顧客側の代表者として入っている値**で、ハブ等のシステムの氏名（吉川 英治）とは別の項目
- このレコードは「会社URL」が fujitaroad.co.jp、住所が晴海トリトンスクエアで、社名と合っていない（取り込み時に行がずれた可能性）
- 判断: オーナー本人の表記ゆれではないので修正不要。レコード自体が怪しいので、営業担当に確認して「代表者名」を空にするかページを削除する

**次のセッションに頼めること**: 「デマント・ジャパンの代表者名を空にして」など。

---

## 補足: 次のセッションの始め方

接続するリポジトリとブランチは `docs/HUB_HANDOVER_2026-10-20.md` の表のとおり（4 つとも `claude/epic-babbage-p7cudc`。3. を終えたら main）。
最初に「docs/HUB_HANDOVER_2026-10-20.md と docs/OWNER_TASKS_2026-10-20.md を読んで」と伝えれば続きから始められる。
