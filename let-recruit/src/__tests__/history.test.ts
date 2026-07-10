import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadHistory,
  saveEntry,
  deleteEntry,
  deleteEntries,
  bulkUpdateField,
} from "@/lib/history";
import {
  makeTitle,
  filterHistory,
  formatSavedAt,
  applyBulkField,
  type HistoryEntry,
} from "@/lib/history-util";
import { emptyJobPosting } from "@/lib/types";

// サーバーAPI未接続を再現（fetchは常に失敗→localStorageにフォールバック）
beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("no server"))),
  );
});

function entry(id: string, savedAt: number, company = ""): HistoryEntry {
  const job = emptyJobPosting();
  job.companyName = company;
  return { id, savedAt, title: makeTitle(job), job };
}

describe("makeTitle", () => {
  it("会社名と職種からタイトルを作る", () => {
    const job = emptyJobPosting();
    job.companyName = "株式会社テスト";
    job.jobTitle = "エンジニア";
    expect(makeTitle(job)).toBe("株式会社テスト｜エンジニア");
  });
});

describe("saveEntry / loadHistory（localフォールバック）", () => {
  it("新規保存すると履歴に追加される", async () => {
    const job = emptyJobPosting();
    job.companyName = "A社";
    const { id, result } = await saveEntry(job, null, 1000);
    expect(result.mode).toBe("local");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe(id);
    const loaded = await loadHistory();
    expect(loaded.entries).toHaveLength(1);
  });

  it("id指定で上書き保存する", async () => {
    const job = emptyJobPosting();
    job.companyName = "A社";
    const { id } = await saveEntry(job, null, 1000);
    job.companyName = "A社（改）";
    const { result } = await saveEntry(job, id, 2000);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].title).toContain("A社（改）");
  });
});

describe("deleteEntry / deleteEntries", () => {
  it("複数削除できる", async () => {
    const a = (await saveEntry(emptyJobPosting(), null, 1000)).id;
    await saveEntry(emptyJobPosting(), null, 2000);
    const b = (await saveEntry(emptyJobPosting(), null, 3000)).id;
    const { entries } = await deleteEntries([a, b]);
    expect(entries).toHaveLength(1);
  });

  it("1件削除できる", async () => {
    const a = (await saveEntry(emptyJobPosting(), null, 1000)).id;
    const { entries } = await deleteEntry(a);
    expect(entries).toHaveLength(0);
  });
});

describe("bulkUpdateField（local）", () => {
  it("overwriteは対象を上書きする", async () => {
    const a = (await saveEntry(seed("A社"), null, 1000)).id;
    const b = (await saveEntry(seed("B社"), null, 2000)).id;
    const { entries } = await bulkUpdateField(
      [a, b],
      "companyWebsite",
      "https://let-inc.net/",
      "overwrite",
      5000,
    );
    expect(
      entries.every((e) => e.job.companyWebsite === "https://let-inc.net/"),
    ).toBe(true);
  });

  function seed(company: string) {
    const j = emptyJobPosting();
    j.companyName = company;
    return j;
  }
});

describe("applyBulkField（純粋関数）", () => {
  it("fillEmptyは既存値を維持する", () => {
    const e = entry("x", 1, "A社");
    e.job.companyWebsite = "https://existing.example";
    const out = applyBulkField(e, "companyWebsite", "https://new.example", "fillEmpty", 9);
    expect(out).toBe(e); // 変更なし→同一参照
  });

  it("fillEmptyは空欄を埋める", () => {
    const e = entry("x", 1, "A社");
    const out = applyBulkField(e, "companyWebsite", "https://new.example", "fillEmpty", 9);
    expect(out.job.companyWebsite).toBe("https://new.example");
  });
});

describe("filterHistory", () => {
  it("会社名で絞り込む", () => {
    const list = [entry("1", 1, "株式会社LET"), entry("2", 2, "テスト商事")];
    expect(filterHistory(list, "let")).toHaveLength(1);
    expect(filterHistory(list, "テスト")).toHaveLength(1);
    expect(filterHistory(list, "")).toHaveLength(2);
  });
});

describe("過去データの移行", () => {
  it("旧形式の給与(円)で保存された履歴も新形式(万円)で読み込める", async () => {
    // 旧アプリが保存した形をそのままlocalStorageに置く
    const oldEntry = {
      id: "old-1",
      savedAt: 1000,
      title: "旧データ",
      job: {
        jobTitle: "営業",
        salary: { type: "月給", min: 300000, max: 550000, note: "賞与年2回" },
      },
    };
    window.localStorage.setItem(
      "let-recruit-history",
      JSON.stringify([oldEntry]),
    );
    const { entries } = await loadHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0].job.salary.monthlyMin).toBe(30);
    expect(entries[0].job.salary.monthlyMax).toBe(55);
    expect(entries[0].job.salary.note).toBe("賞与年2回");
  });
});

describe("formatSavedAt", () => {
  it("YYYY/MM/DD HH:mm 形式で整形する", () => {
    const ms = new Date(2026, 5, 4, 9, 5).getTime();
    expect(formatSavedAt(ms)).toBe("2026/06/04 09:05");
  });
});
