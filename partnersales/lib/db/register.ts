// ブラウザからのパートナー登録（register_partner RPC を呼び出す）。
// slug / 招待コードの候補はテスト済みの TS ユーティリティで生成し、
// 一意性の最終担保はサーバ側 RPC が行う。
import { getBrowserClient, hasBrowserSupabase } from "./supabase";
import { generateReferralCode, slugify } from "@/lib/referral-code";

export interface RegisterInput {
  name: string;
  person?: string;
  email?: string;
  /** 紹介元の招待コード（任意。未指定ならルート登録） */
  referrerCode?: string;
}

export interface RegisterResult {
  id: string;
  slug: string;
  referralCode: string;
}

export { hasBrowserSupabase };

export async function registerPartner(input: RegisterInput): Promise<RegisterResult> {
  const sb = getBrowserClient();
  const desiredSlug = slugify(input.name);
  const desiredCode = generateReferralCode(input.name);

  const { data, error } = await sb.rpc("register_partner", {
    p_name: input.name,
    p_person: input.person ?? null,
    p_email: input.email ?? null,
    p_referrer_code: input.referrerCode ?? null,
    p_desired_slug: desiredSlug,
    p_desired_code: desiredCode,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("登録結果が取得できませんでした");
  return { id: row.id, slug: row.slug, referralCode: row.referral_code };
}
