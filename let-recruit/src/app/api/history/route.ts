import { NextResponse } from "next/server";
import { z } from "zod";
import { JobPostingSchema } from "@/lib/types";
import {
  isDbConfigured,
  listEntries,
  upsertEntry,
  deleteEntriesByIds,
  type StoredEntry,
} from "@/lib/server-store";
import { makeTitle } from "@/lib/history-util";

export const runtime = "nodejs";

const StoredEntrySchema = z.object({
  id: z.string(),
  savedAt: z.number(),
  title: z.string().optional(),
  job: JobPostingSchema,
});

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), entry: StoredEntrySchema }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string()) }),
  z.object({
    action: z.literal("import"),
    entries: z.array(StoredEntrySchema),
  }),
]);

function dbUnavailable() {
  return NextResponse.json(
    { error: "not-configured", message: "共有データベースが未設定です。" },
    { status: 503 },
  );
}

/** 一覧取得 */
export async function GET(): Promise<NextResponse> {
  if (!isDbConfigured()) return dbUnavailable();
  try {
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました。";
    return NextResponse.json({ error: "db-error", message }, { status: 500 });
  }
}

/** 保存 / 一括削除 / インポート */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isDbConfigured()) return dbUnavailable();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  try {
    const data = parsed.data;
    if (data.action === "save") {
      const entry: StoredEntry = {
        id: data.entry.id,
        savedAt: data.entry.savedAt,
        title: data.entry.title || makeTitle(data.entry.job),
        job: data.entry.job,
      };
      await upsertEntry(entry);
    } else if (data.action === "delete") {
      await deleteEntriesByIds(data.ids);
    } else if (data.action === "import") {
      for (const e of data.entries) {
        await upsertEntry({
          id: e.id,
          savedAt: e.savedAt,
          title: e.title || makeTitle(e.job),
          job: e.job,
        });
      }
    }
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新に失敗しました。";
    return NextResponse.json({ error: "db-error", message }, { status: 500 });
  }
}
