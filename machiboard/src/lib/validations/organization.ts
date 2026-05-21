import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以内です"),
  type: z.enum(["自治会", "町内会", "管理組合", "その他"]),
  postal_code: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "正しい郵便番号を入力してください")
    .nullable()
    .default(null),
  address: z.string().max(200).nullable().default(null),
  household_count: z.number().int().min(0).default(0),
});

export const joinOrganizationSchema = z.object({
  invite_code: z
    .string()
    .min(1, "招待コードを入力してください")
    .max(20, "招待コードが正しくありません"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type JoinOrganizationInput = z.infer<typeof joinOrganizationSchema>;
