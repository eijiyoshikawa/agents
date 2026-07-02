import { describe, it, expect, beforeEach } from "vitest";
import {
  loadHistory,
  saveEntry,
  deleteEntry,
  deleteEntries,
  bulkUpdateField,
  filterHistory,
  makeTitle,
  formatSavedAt,
} from "@/lib/history";
import { emptyJobPosting } from "@/lib/types";

beforeEach(() => {
  window.localStorage.clear();
});

describe("makeTitle", () => {
  it("会社名と職種からタイトルを作る", () => {
    const job = emptyJobPosting();
    job.companyName = "株式会社テスト";
    job.jobTitle = "エンジニア";
    expect(makeTitle(job)).toBe("株式会社テスト｜エンジニア");
  });

  it("未入力時はプレースホルダを使う", () => {
    expect(makeTitle(emptyJobPosting())).toContain("会社名未入力");
  });
});

describe("saveEntry / loadHistory", () => {
  it("新規保存すると履歴に追加される", () => {
    const job = emptyJobPosting();
    job.companyName = "A社";
    const { id, history } = saveEntry(job, null, 1000);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(id);
    expect(loadHistory()).toHaveLength(1);
  });

  it("id指定で上書き保存する（重複追加しない）", () => {
    const job = emptyJobPosting();
    job.companyName = "A社";
    const { id } = saveEntry(job, null, 1000);
    job.companyName = "A社（改）";
    const { history } = saveEntry(job, id, 2000);
    expect(history).toHaveLength(1);
    expect(history[0].title).toContain("A社（改）");
    expect(history[0].savedAt).toBe(2000);
  });

  it("新しい順に並ぶ", () => {
    saveEntry(emptyJobPosting(), null, 1000);
    saveEntry(emptyJobPosting(), null, 3000);
    saveEntry(emptyJobPosting(), null, 2000);
    const list = loadHistory();
    expect(list.map((e) => e.savedAt)).toEqual([3000, 2000, 1000]);
  });
});

describe("deleteEntry", () => {
  it("指定IDを削除する", () => {
    const { id } = saveEntry(emptyJobPosting(), null, 1000);
    saveEntry(emptyJobPosting(), null, 2000);
    const rest = deleteEntry(id);
    expect(rest).toHaveLength(1);
    expect(rest.find((e) => e.id === id)).toBeUndefined();
  });
});

describe("deleteEntries", () => {
  it("複数IDをまとめて削除する", () => {
    const a = saveEntry(emptyJobPosting(), null, 1000).id;
    const b = saveEntry(emptyJobPosting(), null, 2000).id;
    saveEntry(emptyJobPosting(), null, 3000);
    const rest = deleteEntries([a, b]);
    expect(rest).toHaveLength(1);
  });
});

describe("bulkUpdateField", () => {
  function seed() {
    const j1 = emptyJobPosting();
    j1.companyName = "A社";
    const j2 = emptyJobPosting();
    j2.companyName = "B社";
    j2.companyWebsite = "https://existing.example";
    const a = saveEntry(j1, null, 1000).id;
    const b = saveEntry(j2, null, 2000).id;
    return { a, b };
  }

  it("overwriteは常に上書きする", () => {
    const { a, b } = seed();
    bulkUpdateField([a, b], "companyWebsite", "https://let-inc.net/", "overwrite", 5000);
    const list = loadHistory();
    expect(list.every((e) => e.job.companyWebsite === "https://let-inc.net/")).toBe(true);
  });

  it("fillEmptyは空欄のみ設定する", () => {
    const { a, b } = seed();
    bulkUpdateField([a, b], "companyWebsite", "https://let-inc.net/", "fillEmpty", 5000);
    const list = loadHistory();
    const A = list.find((e) => e.id === a)!;
    const B = list.find((e) => e.id === b)!;
    expect(A.job.companyWebsite).toBe("https://let-inc.net/"); // 空欄→設定
    expect(B.job.companyWebsite).toBe("https://existing.example"); // 既存→維持
  });

  it("選択外は変更しない", () => {
    const { a, b } = seed();
    bulkUpdateField([a], "industry", "IT", "overwrite", 5000);
    const list = loadHistory();
    expect(list.find((e) => e.id === a)!.job.industry).toBe("IT");
    expect(list.find((e) => e.id === b)!.job.industry).toBe("");
  });
});

describe("filterHistory", () => {
  it("会社名で絞り込む（大文字小文字無視）", () => {
    const j1 = emptyJobPosting();
    j1.companyName = "株式会社LET";
    const j2 = emptyJobPosting();
    j2.companyName = "テスト商事";
    saveEntry(j1, null, 1000);
    saveEntry(j2, null, 2000);
    const list = loadHistory();
    expect(filterHistory(list, "let")).toHaveLength(1);
    expect(filterHistory(list, "テスト")).toHaveLength(1);
    expect(filterHistory(list, "")).toHaveLength(2);
  });
});

describe("formatSavedAt", () => {
  it("YYYY/MM/DD HH:mm 形式で整形する", () => {
    const ms = new Date(2026, 5, 4, 9, 5).getTime(); // 2026/06/04 09:05
    expect(formatSavedAt(ms)).toBe("2026/06/04 09:05");
  });
});
