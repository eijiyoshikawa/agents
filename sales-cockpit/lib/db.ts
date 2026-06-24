// Postgres(Neon)バックエンド。接続文字列が設定されている時だけ有効。
// 未設定なら dbConfigured()=false となり、アプリは従来のNotionキャッシュ経路で動作する（フォールバック）。
import { neon } from "@neondatabase/serverless";
import { fetchCustomersSlim, fetchContracts } from "./notion";
import { normalizeCompanyName, normalizePhone } from "./leadflags";
import type { ListCustomer, Contract } from "./types";

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
  await sql`CREATE TABLE IF NOT EXISTS sc_contracts (
    id text PRIMARY KEY, name text, status text, monthly bigint, start_date text, end_date text,
    kinds text, churn_risk text, next_renewal text, s_rep text, cs_rep text, health text,
    customer_id text, synced_at timestamptz
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sc_sync_meta ( key text PRIMARY KEY, value text )`;
}

const CUST_COLS = 21;
async function upsertCustomers(rows: ListCustomer[], stamp: string): Promise<void> {
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
        c.callCount, c.lastCallDate, c.appointmentDate, c.lastEdited, c.address, c.confirm, stamp,
      );
      return `(${ph})`;
    });
    const text =
      `INSERT INTO sc_customers (id,url,name,name_norm,phone,phone_norm,status,rank,industry,phase,method,pref,is_rep,s_rep,call_count,last_call_date,appointment_date,last_edited,address,confirm,synced_at) VALUES ${tuples.join(",")} ` +
      `ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url,name=EXCLUDED.name,name_norm=EXCLUDED.name_norm,phone=EXCLUDED.phone,phone_norm=EXCLUDED.phone_norm,status=EXCLUDED.status,rank=EXCLUDED.rank,industry=EXCLUDED.industry,phase=EXCLUDED.phase,method=EXCLUDED.method,pref=EXCLUDED.pref,is_rep=EXCLUDED.is_rep,s_rep=EXCLUDED.s_rep,call_count=EXCLUDED.call_count,last_call_date=EXCLUDED.last_call_date,appointment_date=EXCLUDED.appointment_date,last_edited=EXCLUDED.last_edited,address=EXCLUDED.address,confirm=EXCLUDED.confirm,synced_at=EXCLUDED.synced_at`;
    await sql.query(text, values);
  }
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

/** NotionからDBへ全件同期（cronで実行。重いNotion取得はここだけ）。 */
export async function syncAll(): Promise<{ customers: number; contracts: number; ms: number }> {
  const t0 = Date.now();
  await ensureSchema();
  const stamp = new Date().toISOString();
  const [customers, contracts] = await Promise.all([fetchCustomersSlim(), fetchContracts()]);
  await upsertCustomers(customers, stamp);
  await upsertContracts(contracts, stamp);
  const sql = db();
  await sql.query(`DELETE FROM sc_customers WHERE synced_at < $1`, [stamp]);
  await sql.query(`DELETE FROM sc_contracts WHERE synced_at < $1`, [stamp]);
  await sql.query(`INSERT INTO sc_sync_meta (key,value) VALUES ('last_sync',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [stamp]);
  return { customers: customers.length, contracts: contracts.length, ms: Date.now() - t0 };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function dbGetAllSlim(): Promise<ListCustomer[]> {
  const sql = db();
  const rows = (await sql`SELECT id,url,name,phone,status,rank,industry,phase,method,pref,is_rep,s_rep,call_count,last_call_date,appointment_date,last_edited,address,confirm FROM sc_customers`) as any[];
  return rows.map((r) => ({
    id: r.id, url: r.url, name: r.name, phone: r.phone, status: r.status, rank: r.rank,
    industry: r.industry, phase: r.phase, method: r.method, pref: r.pref, isRep: r.is_rep, sRep: r.s_rep,
    callCount: r.call_count, lastCallDate: r.last_call_date, appointmentDate: r.appointment_date,
    lastEdited: r.last_edited, address: r.address, confirm: r.confirm,
  }));
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
