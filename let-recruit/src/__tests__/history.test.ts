import { describe, it, expect, beforeEach } from "vitest";
import {
  loadHistory,
  saveEntry,
  deleteEntry,
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

describe("formatSavedAt", () => {
  it("YYYY/MM/DD HH:mm 形式で整形する", () => {
    const ms = new Date(2026, 5, 4, 9, 5).getTime(); // 2026/06/04 09:05
    expect(formatSavedAt(ms)).toBe("2026/06/04 09:05");
  });
});
