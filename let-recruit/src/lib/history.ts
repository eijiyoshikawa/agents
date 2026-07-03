import type { JobPosting } from "./types";
import {
  makeTitle,
  applyBulkField,
  type HistoryEntry,
  type BulkFieldKey,
} from "./history-util";

export type { HistoryEntry, BulkFieldKey } from "./history-util";
export {
  makeTitle,
  filterHistory,
  formatSavedAt,
  BULK_FIELDS,
} from "./history-util";

const STORAGE_KEY = "let-recruit-history";
const MAX_ENTRIES = 500;

/** 保存モード。server=DB共有 / local=このブラウザのみ。 */
export type StorageMode = "server" | "local";

/* ---------------- localStorage 実装 ---------------- */

function localLoad(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function localPersist(list: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(list.slice(0, MAX_ENTRIES)),
  );
}

/* ---------------- サーバー(API)実装 ---------------- */

/** サーバーAPIが使えるか（503なら未設定=localへフォールバック）。 */
async function serverList(): Promise<HistoryEntry[] | null> {
  try {
    const res = await fetch("/api/history", { cache: "no-store" });
    if (res.status === 503) return null; // DB未設定
    if (!res.ok) throw new Error("server error");
    const data = await res.json();
    return (data.entries as HistoryEntry[]) ?? [];
  } catch {
    return null;
  }
}

async function serverSave(entry: HistoryEntry): Promise<HistoryEntry[] | null> {
  return serverPost({ action: "save", entry });
}

async function serverDelete(ids: string[]): Promise<HistoryEntry[] | null> {
  return serverPost({ action: "delete", ids });
}

async function serverImport(
  entries: HistoryEntry[],
): Promise<HistoryEntry[] | null> {
  if (entries.length === 0) return serverList();
  return serverPost({ action: "import", entries });
}

async function serverPost(body: unknown): Promise<HistoryEntry[] | null> {
  try {
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 503) return null;
    if (!res.ok) throw new Error("server error");
    const data = await res.json();
    return (data.entries as HistoryEntry[]) ?? [];
  } catch {
    return null;
  }
}

/* ---------------- 公開API（サーバー優先・local自動フォールバック） ---------------- */

export interface HistoryResult {
  entries: HistoryEntry[];
  mode: StorageMode;
}

let migratedToServer = false;

/**
 * 履歴を読み込む。DB接続時はサーバー、未設定時はこのブラウザから。
 * 初回サーバー接続時、ローカルの履歴を自動でサーバーへ移行（取り込み）する。
 */
export async function loadHistory(): Promise<HistoryResult> {
  const server = await serverList();
  if (server !== null) {
    // 初回だけ、ローカルの履歴をサーバーへ取り込む（重複はupsertで無害）
    if (!migratedToServer) {
      migratedToServer = true;
      const local = localLoad();
      if (local.length > 0) {
        const merged = await serverImport(local);
        if (merged) return { entries: merged, mode: "server" };
      }
    }
    return { entries: server, mode: "server" };
  }
  return { entries: localLoad(), mode: "local" };
}

/**
 * 求人票を保存（id指定で上書き、無ければ新規）。保存後の全履歴を返す。
 */
export async function saveEntry(
  job: JobPosting,
  id: string | null,
  timestamp: number,
): Promise<{ id: string; result: HistoryResult }> {
  const entryId = id || `${timestamp}-${Math.floor(timestamp % 100000)}`;
  const entry: HistoryEntry = {
    id: entryId,
    savedAt: timestamp,
    title: makeTitle(job),
    job,
  };

  const server = await serverSave(entry);
  if (server !== null) {
    return { id: entryId, result: { entries: server, mode: "server" } };
  }

  // local
  const list = localLoad();
  const idx = list.findIndex((e) => e.id === entryId);
  if (idx !== -1) list[idx] = entry;
  else list.unshift(entry);
  localPersist(list);
  return { id: entryId, result: { entries: localLoad(), mode: "local" } };
}

/** 複数IDを削除。残りを返す。 */
export async function deleteEntries(ids: string[]): Promise<HistoryResult> {
  const server = await serverDelete(ids);
  if (server !== null) return { entries: server, mode: "server" };

  const set = new Set(ids);
  const list = localLoad().filter((e) => !set.has(e.id));
  localPersist(list);
  return { entries: localLoad(), mode: "local" };
}

/** 1件削除。 */
export async function deleteEntry(id: string): Promise<HistoryResult> {
  return deleteEntries([id]);
}

/**
 * 選択IDの指定フィールドを一括更新。変更後の全履歴を返す。
 * サーバー時は変更したエントリのみupsertする。
 */
export async function bulkUpdateField(
  ids: string[],
  field: BulkFieldKey,
  value: string,
  mode: "overwrite" | "fillEmpty",
  timestamp: number,
): Promise<HistoryResult> {
  const set = new Set(ids);

  const server = await serverList();
  if (server !== null) {
    // 対象のうち、実際に値が変わるエントリだけをupsart対象にする
    const changed = server
      .filter((e) => set.has(e.id))
      .map((e) => applyBulkField(e, field, value, mode, timestamp))
      .filter((updated, i) => {
        const original = server.filter((e) => set.has(e.id))[i];
        return updated !== original; // applyBulkFieldは変更なしなら同一参照を返す
      });
    const merged = await serverImport(changed);
    if (merged) return { entries: merged, mode: "server" };
  }

  // local
  const list = localLoad().map((e) =>
    set.has(e.id) ? applyBulkField(e, field, value, mode, timestamp) : e,
  );
  localPersist(list);
  return { entries: localLoad(), mode: "local" };
}
