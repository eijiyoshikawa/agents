// ログイン失敗のレート制限（IP 単位・インメモリ）。
// サーバーレスではインスタンスごとの制限になるが、総当たりの速度を落とす目的には十分。
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function prune(now: number) {
  if (store.size < 1000) return;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export function isBlocked(key: string, now: number = Date.now()): boolean {
  const e = store.get(key);
  if (!e) return false;
  if (e.resetAt <= now) {
    store.delete(key);
    return false;
  }
  return e.count >= MAX_FAILURES;
}

export function recordFailure(key: string, now: number = Date.now()): void {
  prune(now);
  const e = store.get(key);
  if (!e || e.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  e.count += 1;
}

export function clearFailures(key: string): void {
  store.delete(key);
}

export function clientKey(req: Request | undefined): string {
  const h = req?.headers;
  const fwd = h?.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || h?.get("x-real-ip") || "unknown";
}
