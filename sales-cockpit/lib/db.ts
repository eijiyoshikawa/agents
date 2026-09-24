// Postgres(Neon)バックエンド。接続文字列が設定されている時だけ有効。
// 未設定なら dbConfigured()=false となり、アプリは従来のNotionキャッシュ経路で動作する（フォールバック）。
import { neon } from "@neondatabase/serverless";
import { fetchCustomersSlim, fetchContracts, NOTION_MAX_PAGES } from "./notion";
import { normalizeCompanyName, normalizePhone, agencyReason } from "./leadflags";
import { scoreLead } from "./priority";
import type { ListCustomer, Contract, SearchParams, SearchResult, SearchRow, Breakdowns } from "./types";

// 接続文字列を解決：標準名 → 無ければ postgres:// 形式の環境変数を自動検出（Custom Prefix対策）。
function resolveConn(): string {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (direct) return direct;
  const candidates: string[] = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string" && /^postgres(ql)?:\/\//.test(v) && /url/i.test(k)) candidates.push(v);
  }
  // プール接続(-pooler)を優先（無ければ最初の候補）
  return candidates.find((u) => u.includes("-pooler")) ?? candidates[0] ?? "";
}

let _conn: string | null = null;
function conn(): string {
  if (_conn === null) _conn = resolveConn();
  return _conn;
}

export function dbConfigured(): boolean {
  return Boolean(conn());
}

let _sql: ReturnType<typeof neon> | null = null;
function db() {
  if (!_sql) _sql = neon(conn());
  return _sql;
}

export async function ensureSchema(): Promise<void> {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS sc_customers (
    id text PRIMARY KEY, url text, name text, name_norm text, phone text, phone_norm text,
    status text, rank text, industry text, phase text, method text, pref text,
    is_rep text, s_rep text, call_count integer, last_call_date text, appointment_date text,
    last_edited text, address text, confirm text, synced_at timestamptz
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_status ON sc_customers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_is_rep ON sc_customers(is_rep)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_last_edited ON sc_customers(last_edited)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_appt ON sc_customers(appointment_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_name_norm ON sc_customers(name_norm)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_phone_norm ON sc_customers(phone_norm)`;
  // 重複候補 / 人材紹介の疑い を同期時に事前計算して保存する列（検索・件数をSQL側で高速に出すため）
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS is_dup boolean`;
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS agency_reason text`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_is_dup ON sc_customers(is_dup)`;
  // 優先アプローチ用: 従業員数・掲載元メディア・優先スコア（同期時に scoreLead で計算）
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS employees integer`;
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS media text`;
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS priority integer`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sc_customers_priority ON sc_customers(priority)`;
  // 未経験可求人フラグ（採用ページ自動スキャンで判定。あり/なし/不明）
  await sql`ALTER TABLE sc_customers ADD COLUMN IF NOT EXISTS no_exp_job text`;
  await sql`CREATE TABLE IF NOT EXISTS sc_contracts (
    id text PRIMARY KEY, name text, status text, monthly bigint, start_date text, end_date text,
    kinds text, churn_risk text, next_renewal text, s_rep text, cs_rep text, health text,
    customer_id text, synced_at timestamptz
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sc_sync_meta ( key text PRIMARY KEY, value text )`;
}

const CUST_COLS = 26;
async function upsertCustomers(
  rows: ListCustomer[],
  stamp: string,
  agency: Map<string, string>,
): Promise<void> {
  const sql = db();
  const BATCH = 400;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values: unknown[] = [];
    let idx = 0;
    const tuples = chunk.map((c) => {
      const ph = Array.from({ length: CUST_COLS }, () => `$${++idx}`).join(",");
      values.push(
        c.id, c.url, c.name, normalizeCompanyName(c.name), c.phone, normalizePhone(c.phone),
        c.status, c.rank, c.industry, c.phase, c.method, c.pref, c.isRep, c.sRep,
        c.callCount, c.lastCallDate, c.appointmentDate, c.lastEdited, c.address, c.confirm,
        c.employees ?? null, JSON.stringify(c.media ?? []), scoreLead(c), c.noExpJob,
        agency.get(c.id) ?? null, stamp,
      );
      return `(${ph})`;
    });
    // is_dup はここでは書かず、upsert後に recomputeDupFlags() がSQLで全体整合を取る
    const text =
      `INSERT INTO sc_customers (id,url,name,name_norm,phone,phone_norm,status,rank,industry,phase,method,pref,is_rep,s_rep,call_count,last_call_date,appointment_date,last_edited,address,confirm,employees,media,priority,no_exp_job,agency_reason,synced_at) VALUES ${tuples.join(",")} ` +
      `ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url,name=EXCLUDED.name,name_norm=EXCLUDED.name_norm,phone=EXCLUDED.phone,phone_norm=EXCLUDED.phone_norm,status=EXCLUDED.status,rank=EXCLUDED.rank,industry=EXCLUDED.industry,phase=EXCLUDED.phase,method=EXCLUDED.method,pref=EXCLUDED.pref,is_rep=EXCLUDED.is_rep,s_rep=EXCLUDED.s_rep,call_count=EXCLUDED.call_count,last_call_date=EXCLUDED.last_call_date,appointment_date=EXCLUDED.appointment_date,last_edited=EXCLUDED.last_edited,address=EXCLUDED.address,confirm=EXCLUDED.confirm,employees=EXCLUDED.employees,media=EXCLUDED.media,priority=EXCLUDED.priority,no_exp_job=EXCLUDED.no_exp_job,agency_reason=EXCLUDED.agency_reason,synced_at=EXCLUDED.synced_at`;
    await sql.query(text, values);
  }
}

/**
 * 重複候補フラグ(is_dup)をDB内で再計算する（転送ゼロ・数十ms）。
 * ロジックは computeDuplicates と同一: 正規化名の一致 or 正規化電話(9桁以上)の一致が2件以上。
 * 変更があった行だけ UPDATE するので増分同期でも軽い。
 */
async function recomputeDupFlags(): Promise<void> {
  const sql = db();
  await sql.query(
    `UPDATE sc_customers c SET is_dup = d.dup FROM (
       SELECT id,
         ((name_norm IS NOT NULL AND name_norm <> '' AND COUNT(*) OVER (PARTITION BY name_norm) > 1)
          OR (phone_norm IS NOT NULL AND length(phone_norm) >= 9 AND COUNT(*) OVER (PARTITION BY phone_norm) > 1)) AS dup
       FROM sc_customers
     ) d
     WHERE c.id = d.id AND c.is_dup IS DISTINCT FROM d.dup`,
    [],
  );
}

const CONTRACT_COLS = 14;
async function upsertContracts(rows: Contract[], stamp: string): Promise<void> {
  const sql = db();
  const BATCH = 400;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values: unknown[] = [];
    let idx = 0;
    const tuples = chunk.map((c) => {
      const ph = Array.from({ length: CONTRACT_COLS }, () => `$${++idx}`).join(",");
      values.push(
        c.id, c.name, c.status, c.monthly, c.start, c.end, JSON.stringify(c.kinds ?? []),
        c.churnRisk, c.nextRenewal, c.sRep, c.csRep, c.health, c.customerId, stamp,
      );
      return `(${ph})`;
    });
    const text =
      `INSERT INTO sc_contracts (id,name,status,monthly,start_date,end_date,kinds,churn_risk,next_renewal,s_rep,cs_rep,health,customer_id,synced_at) VALUES ${tuples.join(",")} ` +
      `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,monthly=EXCLUDED.monthly,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,kinds=EXCLUDED.kinds,churn_risk=EXCLUDED.churn_risk,next_renewal=EXCLUDED.next_renewal,s_rep=EXCLUDED.s_rep,cs_rep=EXCLUDED.cs_rep,health=EXCLUDED.health,customer_id=EXCLUDED.customer_id,synced_at=EXCLUDED.synced_at`;
    await sql.query(text, values);
  }
}

async function metaGet(key: string): Promise<string | null> {
  const rows = (await db().query(`SELECT value FROM sc_sync_meta WHERE key = $1`, [key])) as Array<{ value: string }>;
  return rows[0]?.value ?? null;
}
async function metaSet(key: string, value: string): Promise<void> {
  await db().query(
    `INSERT INTO sc_sync_meta (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [key, value],
  );
}

// 増分同期の取りこぼし防止マージン（時計ズレ・境界ちょうどの更新対策）
const INCR_MARGIN_MS = 15 * 60 * 1000;
// これより古い full 同期しか無ければ full に昇格（削除の整合を1日1回取る）
const FULL_EVERY_MS = 24 * 3600 * 1000;

/**
 * NotionからDBへ同期（cronで実行。重いNotion取得はここだけ）。
 * 既定は増分同期: 前回同期以降に更新されたページだけ取得し、全2万件超の
 * 取り直し（280回超のAPI呼び出し・数分）を数回・数秒に抑える。
 * 増分では削除を検知できないため、24時間ごと（または ?mode=full）に全件同期して整合を取る。
 */
export async function syncAll(opts?: { mode?: "full" | "incremental" }): Promise<{
  mode: "full" | "incremental";
  customers: number;
  contracts: number;
  ms: number;
  truncated: boolean;
}> {
  const t0 = Date.now();
  await ensureSchema();
  const sql = db();
  const stamp = new Date().toISOString();

  let mode: "full" | "incremental" = opts?.mode ?? "incremental";
  const [lastSync, lastFull] = await Promise.all([metaGet("last_sync"), metaGet("last_full_sync")]);
  // 初回・メタ欠損・fullが24時間以上前 → full に昇格
  if (mode === "incremental" && (!lastSync || !lastFull || Date.now() - Date.parse(lastFull) > FULL_EVERY_MS)) {
    mode = "full";
  }
  const editedSince =
    mode === "incremental" ? new Date(Date.parse(lastSync as string) - INCR_MARGIN_MS).toISOString() : undefined;

  // 顧客は増分/全件を切替。契約は件数が少ないため常に全件（削除整合も毎回取れる）。
  const [customers, contracts] = await Promise.all([fetchCustomersSlim(editedSince), fetchContracts()]);
  // 人材紹介の疑いは行単体で決まるため upsert 時に計算。重複候補は upsert 後にSQLで全体再計算。
  const agency = new Map<string, string>();
  for (const c of customers) {
    const r = agencyReason(c);
    if (r) agency.set(c.id, r);
  }
  await upsertCustomers(customers, stamp, agency);
  await recomputeDupFlags();
  await upsertContracts(contracts, stamp);
  // 取得上限に達している＝Notionを取り切れていない可能性。その場合は削除を行わない（誤削除防止）。
  const truncated = customers.length >= NOTION_MAX_PAGES * 100;
  if (mode === "full" && !truncated) {
    await sql.query(`DELETE FROM sc_customers WHERE synced_at < $1`, [stamp]);
  }
  await sql.query(`DELETE FROM sc_contracts WHERE synced_at < $1`, [stamp]);
  await metaSet("last_sync", stamp);
  if (mode === "full") await metaSet("last_full_sync", stamp);
  return { mode, customers: customers.length, contracts: contracts.length, ms: Date.now() - t0, truncated };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const SLIM_COLS =
  "id,url,name,phone,status,rank,industry,phase,method,pref,is_rep,s_rep,call_count,last_call_date,appointment_date,last_edited,address,confirm,employees,media,no_exp_job";

function parseMedia(v: unknown): string[] {
  if (typeof v !== "string" || !v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapSlimRow(r: any): ListCustomer {
  return {
    id: r.id, url: r.url, name: r.name, phone: r.phone, status: r.status, rank: r.rank,
    industry: r.industry, phase: r.phase, method: r.method, pref: r.pref, isRep: r.is_rep, sRep: r.s_rep,
    callCount: r.call_count, lastCallDate: r.last_call_date, appointmentDate: r.appointment_date,
    lastEdited: r.last_edited, address: r.address, confirm: r.confirm,
    employees: r.employees ?? null, media: parseMedia(r.media), noExpJob: r.no_exp_job ?? null,
  };
}

export async function dbGetAllSlim(): Promise<ListCustomer[]> {
  const rows = (await db().query(`SELECT ${SLIM_COLS} FROM sc_customers`, [])) as any[];
  return rows.map(mapSlimRow);
}

/** 商談パイプライン対象のみ（WHERE status IN）。全件転送を避ける軽量版。 */
export async function dbGetPipelineSlim(statuses: string[]): Promise<ListCustomer[]> {
  if (statuses.length === 0) return [];
  const ph = statuses.map((_, i) => `$${i + 1}`).join(",");
  const rows = (await db().query(
    `SELECT ${SLIM_COLS} FROM sc_customers WHERE status IN (${ph})`,
    statuses,
  )) as any[];
  return rows.map(mapSlimRow);
}

/** アポ取得日あり顧客のみ（アポ月次履歴用・軽量）。 */
export async function dbGetAppointedSlim(): Promise<ListCustomer[]> {
  const rows = (await db().query(
    `SELECT ${SLIM_COLS} FROM sc_customers WHERE appointment_date IS NOT NULL AND appointment_date <> ''`,
    [],
  )) as any[];
  return rows.map(mapSlimRow);
}

/**
 * サマリ集計用: 指定日以降に更新された or アポ取得日が指定日以降 の顧客のみ。
 * 日次/週次レポートの statsForRange が参照する範囲だけを取得し、全件転送を避ける。
 * 文字列比較（ISO/YYYY-MM-DD の辞書順）で期間を絞る。
 */
export async function dbGetActiveSince(sinceYmd: string): Promise<ListCustomer[]> {
  const rows = (await db().query(
    `SELECT ${SLIM_COLS} FROM sc_customers WHERE last_edited >= $1 OR (appointment_date IS NOT NULL AND appointment_date >= $1)`,
    [sinceYmd],
  )) as any[];
  return rows.map(mapSlimRow);
}

export type PriorityMode = "new" | "follow";
export type PriorityRow = ListCustomer & { priority: number | null };

/**
 * 優先アプローチリスト。実績分析ベースの priority スコア降順で1ページ分を返す。
 * - new: 未架電（ステータス空 or アプローチ前・アポなし）＝新規架電の優先順
 * - follow: 追客在庫（再コール・資料請求・担当者不在）＝掘り起こしの優先順
 * @returns scored=false はスコア未計算行のみ（フル同期前）で並びが暫定であることを示す
 */
export async function dbGetPriorityList(
  mode: PriorityMode,
  page: number,
  pageSize: number,
  noExpOnly = false,
): Promise<{ rows: PriorityRow[]; total: number; page: number; pageSize: number; scored: boolean }> {
  const sql = db();
  const base =
    mode === "new"
      ? `WHERE (status IS NULL OR status = 'アプローチ前') AND (appointment_date IS NULL OR appointment_date = '')`
      : `WHERE status IN ('再コール','資料請求','担当者不在')`;
  // 未経験可求人ありの企業のみに絞る（採用ページ自動スキャンの判定結果）
  const whereSql = noExpOnly ? `${base} AND no_exp_job = 'あり'` : base;
  const ps = Math.min(Math.max(pageSize, 1), 100);
  const p = Math.max(page, 1);
  const cnt = (await sql.query(
    `SELECT COUNT(*)::int AS total, COUNT(priority)::int AS scored FROM sc_customers ${whereSql}`,
    [],
  )) as Array<{ total: number; scored: number }>;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const rows = (await sql.query(
    `SELECT ${SLIM_COLS}, priority FROM sc_customers ${whereSql} ` +
      `ORDER BY priority DESC NULLS LAST, employees DESC NULLS LAST, id ASC LIMIT $1 OFFSET $2`,
    [ps, (p - 1) * ps],
  )) as any[];
  return {
    rows: rows.map((r) => ({ ...mapSlimRow(r), priority: r.priority ?? null })),
    total: cnt[0]?.total ?? 0,
    page: p,
    pageSize: ps,
    scored: (cnt[0]?.scored ?? 0) > 0,
  };
}

/**
 * 分析ページの項目別内訳をDB内で集計（GROUP BY）。全件をアプリに読まない。
 * groupCount と同一仕様: 空/NULL は「(未設定)」、件数降順、industry/pref は上位15件。
 * excludedReps は IS担当の内訳から除外する非稼働メンバー。
 */
export async function dbGetBreakdowns(
  excludedReps: string[],
): Promise<{ breakdowns: Breakdowns; total: number }> {
  const dims: Array<{ key: string; col: string; limit: number }> = [
    { key: "rank", col: "rank", limit: 0 },
    { key: "industry", col: "industry", limit: 15 },
    { key: "method", col: "method", limit: 0 },
    { key: "phase", col: "phase", limit: 0 },
    { key: "pref", col: "pref", limit: 15 },
  ];
  const parts = dims.map(
    (d) =>
      `SELECT '${d.key}' AS dim, COALESCE(NULLIF(${d.col},''),'(未設定)') AS label, COUNT(*)::int AS count FROM sc_customers GROUP BY 1,2`,
  );
  const vals: unknown[] = [];
  let repWhere = "";
  if (excludedReps.length > 0) {
    const ph = excludedReps.map((_, i) => `$${i + 1}`).join(",");
    vals.push(...excludedReps);
    repWhere = `WHERE is_rep IS NULL OR is_rep = '' OR is_rep NOT IN (${ph})`;
  }
  parts.push(
    `SELECT 'isRep' AS dim, COALESCE(NULLIF(is_rep,''),'(未設定)') AS label, COUNT(*)::int AS count FROM sc_customers ${repWhere} GROUP BY 1,2`,
  );
  const rows = (await db().query(parts.join(" UNION ALL "), vals)) as Array<{
    dim: string;
    label: string;
    count: number;
  }>;

  const pick = (key: string, limit: number) => {
    const arr = rows
      .filter((r) => r.dim === key)
      .map((r) => ({ label: r.label, count: Number(r.count) }))
      .sort((a, b) => b.count - a.count);
    return limit > 0 ? arr.slice(0, limit) : arr;
  };
  // rank は全行を漏れなく分類するため、その合計＝総顧客数
  const total = rows.filter((r) => r.dim === "rank").reduce((s, r) => s + Number(r.count), 0);
  return {
    breakdowns: {
      rank: pick("rank", 0),
      industry: pick("industry", 15),
      method: pick("method", 0),
      phase: pick("phase", 0),
      pref: pick("pref", 15),
      isRep: pick("isRep", 0),
    },
    total,
  };
}

export async function dbGetContracts(): Promise<Contract[]> {
  const sql = db();
  const rows = (await sql`SELECT id,name,status,monthly,start_date,end_date,kinds,churn_risk,next_renewal,s_rep,cs_rep,health,customer_id FROM sc_contracts`) as any[];
  return rows.map((r) => ({
    id: r.id, name: r.name, status: r.status, monthly: Number(r.monthly) || 0,
    start: r.start_date, end: r.end_date, kinds: safeArr(r.kinds), churnRisk: r.churn_risk,
    nextRenewal: r.next_renewal, sRep: r.s_rep, csRep: r.cs_rep, health: r.health, customerId: r.customer_id,
  }));
}

// 並べ替え可能な列（SQLインジェクション防止のホワイトリスト）
const SORT_COL: Record<string, string> = {
  name: "name",
  status: "status",
  rank: "rank",
  industry: "industry",
  isRep: "is_rep",
  callCount: "call_count",
  lastCallDate: "last_call_date",
};

/**
 * 顧客検索・ページングをSQL側で実行する（全件をアプリに読み込まない）。
 * 重複/人材紹介は同期時に保存済みの is_dup / agency_reason を使う。
 * 該当ページの行＋件数(total/dup/agency)だけを返すため、大量データでも高速・低転送。
 */
export async function dbSearchCustomers(p: SearchParams): Promise<SearchResult> {
  const sql = db();
  const where: string[] = [];
  const vals: unknown[] = [];
  const add = (v: unknown) => {
    vals.push(v);
    return `$${vals.length}`;
  };

  if (p.rep) {
    if (p.rep === "__none__") where.push(`(is_rep IS NULL OR is_rep = '')`);
    else where.push(`is_rep = ${add(p.rep)}`);
  }
  if (p.status) {
    if (p.status === "__none__") where.push(`(status IS NULL OR status = '')`);
    else where.push(`status = ${add(p.status)}`);
  }
  if (p.rank) where.push(`rank = ${add(p.rank)}`);
  if (p.industry) where.push(`industry = ${add(p.industry)}`);
  const q = (p.q ?? "").trim();
  if (q) {
    // LIKE のメタ文字をエスケープして部分一致（会社名・電話番号）
    const like = `%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
    const ph = add(like);
    where.push(`(name ILIKE ${ph} OR phone ILIKE ${ph})`);
  }
  if (p.dupOnly) where.push(`is_dup = true`);
  if (p.agencyMode === "exclude") where.push(`agency_reason IS NULL`);
  if (p.agencyMode === "only") where.push(`agency_reason IS NOT NULL`);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const pageSize = Math.min(Math.max(p.pageSize ?? 50, 1), 200);
  const page = Math.max(p.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const sortCol = SORT_COL[p.sort ?? ""] ?? "last_call_date";
  const dir = p.dir === "asc" ? "ASC" : "DESC";
  const nulls = dir === "ASC" ? "NULLS FIRST" : "NULLS LAST";

  // 件数（フィルタ後の total / 重複 / 人材紹介）を1回のスキャンで
  const countText =
    `SELECT COUNT(*)::int AS total, ` +
    `COUNT(*) FILTER (WHERE is_dup)::int AS dup, ` +
    `COUNT(*) FILTER (WHERE agency_reason IS NOT NULL)::int AS agency ` +
    `FROM sc_customers ${whereSql}`;
  const countRows = (await sql.query(countText, vals)) as Array<{ total: number; dup: number; agency: number }>;
  const cnt = countRows[0] ?? { total: 0, dup: 0, agency: 0 };

  // 該当ページの行だけを取得（LIMIT/OFFSET）。id 二次ソートでページ安定化。
  const rowsText =
    `SELECT ${SLIM_COLS}, COALESCE(is_dup,false) AS is_dup, agency_reason ` +
    `FROM sc_customers ${whereSql} ` +
    `ORDER BY ${sortCol} ${dir} ${nulls}, id ASC ` +
    `LIMIT ${add(pageSize)} OFFSET ${add(offset)}`;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const rows = (await sql.query(rowsText, vals)) as any[];

  const mapped: SearchRow[] = rows.map((r) => ({
    ...mapSlimRow(r),
    dup: !!r.is_dup,
    agency: r.agency_reason ?? null,
  }));

  return { rows: mapped, total: cnt.total ?? 0, totalDup: cnt.dup ?? 0, totalAgency: cnt.agency ?? 0, page, pageSize };
}

export async function dbLastSync(): Promise<string | null> {
  try {
    const sql = db();
    const rows = (await sql`SELECT value FROM sc_sync_meta WHERE key='last_sync'`) as any[];
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

function safeArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}
