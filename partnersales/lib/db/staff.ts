// スタッフ操作のクライアント側ラッパー（合言葉でガードされた RPC を呼ぶ）。
// すべて Supabase 設定が前提（未設定なら hasBrowserSupabase() が false）。
import { getBrowserClient, hasBrowserSupabase } from "./supabase";
import { generateReferralCode, slugify } from "@/lib/referral-code";
import type { DealStatus } from "@/lib/types";

export { hasBrowserSupabase };

async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getBrowserClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface StaffRegisterInput {
  secret: string;
  name: string;
  person?: string;
  email?: string;
  referrerCode?: string;
  loginId: string;
}

export async function staffRegisterPartner(input: StaffRegisterInput) {
  const data = await rpc<{ id: string; slug: string; referral_code: string }[]>(
    "staff_register_partner",
    {
      p_secret: input.secret,
      p_name: input.name,
      p_person: input.person ?? null,
      p_email: input.email ?? null,
      p_referrer_code: input.referrerCode ?? null,
      p_desired_slug: slugify(input.name),
      p_desired_code: generateReferralCode(input.name),
      p_login_id: input.loginId,
    }
  );
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, slug: row.slug, referralCode: row.referral_code };
}

export interface StaffDealInput {
  secret: string;
  serviceId: string;
  clientName: string;
  introducerPartnerId: string;
  amount: number;
  status: DealStatus;
  closedAt: string;
  isSelfDeal: boolean;
  note?: string;
}

export function staffCreateDeal(input: StaffDealInput) {
  return rpc<string>("staff_create_deal", {
    p_secret: input.secret,
    p_service_id: input.serviceId,
    p_client_name: input.clientName,
    p_introducer_partner_id: input.introducerPartnerId,
    p_amount: input.amount,
    p_status: input.status,
    p_closed_at: input.closedAt,
    p_is_self_deal: input.isSelfDeal,
    p_note: input.note ?? null,
  });
}

export function staffSetDealStatus(secret: string, dealId: string, status: DealStatus) {
  return rpc<void>("staff_set_deal_status", { p_secret: secret, p_deal_id: dealId, p_status: status });
}

export function staffRecordPayout(
  secret: string,
  partnerId: string,
  amount: number,
  status: "invoiced" | "paid",
  invoiceNo?: string,
  note?: string
) {
  return rpc<string>("staff_record_payout", {
    p_secret: secret,
    p_partner_id: partnerId,
    p_amount: amount,
    p_status: status,
    p_invoice_no: invoiceNo ?? null,
    p_note: note ?? null,
  });
}

export function staffMarkPayoutPaid(secret: string, payoutId: string) {
  return rpc<void>("staff_mark_payout_paid", { p_secret: secret, p_payout_id: payoutId });
}
