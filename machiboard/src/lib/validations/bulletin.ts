import { z } from "zod";

export const bulletinCategorySchema = z.enum([
  "general",
  "garbage",
  "disaster",
  "event",
  "important",
]);

export const bulletinPrioritySchema = z.enum(["normal", "high", "urgent"]);

export const createBulletinSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内です"),
  content: z
    .string()
    .min(1, "本文を入力してください")
    .max(10000, "本文は10,000文字以内です"),
  category: bulletinCategorySchema,
  priority: bulletinPrioritySchema.default("normal"),
  image_urls: z.array(z.string().url()).max(3, "画像は3枚までです").default([]),
  scheduled_at: z.string().datetime().nullable().default(null),
});

export const updateBulletinSchema = createBulletinSchema.partial();

export type CreateBulletinInput = z.infer<typeof createBulletinSchema>;
export type UpdateBulletinInput = z.infer<typeof updateBulletinSchema>;
