import { describe, it, expect } from "vitest";
import { createBulletinSchema } from "@/lib/validations/bulletin";

describe("createBulletinSchema", () => {
  it("validates a valid bulletin", () => {
    const result = createBulletinSchema.safeParse({
      title: "ゴミ収集日の変更について",
      content: "来週月曜日のゴミ収集日が火曜日に変更になります。",
      category: "garbage",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createBulletinSchema.safeParse({
      title: "",
      content: "本文です",
      category: "general",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("タイトルを入力してください");
    }
  });

  it("rejects title over 100 characters", () => {
    const result = createBulletinSchema.safeParse({
      title: "あ".repeat(101),
      content: "本文",
      category: "general",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("タイトルは100文字以内です");
    }
  });

  it("rejects empty content", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "",
      category: "general",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "本文",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const categories = ["general", "garbage", "disaster", "event", "important"] as const;
    for (const category of categories) {
      const result = createBulletinSchema.safeParse({
        title: "タイトル",
        content: "本文",
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults priority to normal", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "本文",
      category: "general",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("normal");
    }
  });

  it("defaults image_urls to empty array", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "本文",
      category: "general",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image_urls).toEqual([]);
    }
  });

  it("rejects more than 3 images", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "本文",
      category: "general",
      image_urls: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("画像は3枚までです");
    }
  });

  it("accepts scheduled_at as ISO string", () => {
    const result = createBulletinSchema.safeParse({
      title: "タイトル",
      content: "本文",
      category: "general",
      scheduled_at: "2026-05-01T09:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
