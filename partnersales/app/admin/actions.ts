"use server";
// スタッフ操作のサーバアクション。スタッフセッションでゲートし、service_role で書き込む。
// （ブラウザに合言葉や service_role を渡さない）
import { getServerClient, hasServerSupabase } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/server";
import { generateReferralCode, slugify } from "@/lib/referral-code";
import { syncPartnerToNotion } from "@/lib/integrations/notion";
import type { DealStatus, Partner } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
  detail?: Record<string, string>;
}

async function ensureUniqueSlug(sb: ReturnType<typeof getServerClient>, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  // 衝突する間サフィックスを増やす
  for (;;) {
    const { data } = await sb.from("partners").select("slug").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n++}`;
  }
}

async function ensureUniqueCode(sb: ReturnType<typeof getServerClient>, name: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const code = generateReferralCode(name);
    const { data } = await sb.from("partners").select("referral_code").eq("referral_code", code).maybeSingle();
    if (!data) return code;
  }
  return `${slugify(name).toUpperCase().slice(0, 4) || "PTNR"}-${Date.now().toString(36).toUpperCase()}`;
}

export async function createDeal(input: {
  serviceId: string;
  clientName: string;
  introducerPartnerId: string;
  amount: number;
  status: DealStatus;
  closedAt: string;
  isSelfDeal: boolean;
  note?: string;
}): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const { error } = await sb.from("deals").insert({
    service_id: input.serviceId,
    client_name: input.clientName,
    introducer_partner_id: input.introducerPartnerId,
    amount: input.amount,
    status: input.status,
    closed_at: input.closedAt,
    is_self_deal: input.isSelfDeal,
    note: input.note || null,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "成約を登録しました" };
}

export async function setDealStatus(dealId: string, status: DealStatus): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const { error } = await sb.from("deals").update({ status }).eq("id", dealId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "ステータスを更新しました" };
}

export async function recordPayout(input: {
  partnerId: string;
  amount: number;
  status: "invoiced" | "paid";
  invoiceNo?: string;
}): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("payouts").insert({
    partner_id: input.partnerId,
    amount: input.amount,
    status: input.status,
    invoice_no: input.invoiceNo || null,
    invoiced_at: today,
    paid_at: input.status === "paid" ? today : null,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "精算レコードを登録しました" };
}

export async function markPayoutPaid(payoutId: string): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();
  const { error } = await sb
    .from("payouts")
    .update({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) })
    .eq("id", payoutId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "振込完了にしました" };
}

export async function registerPartner(input: {
  name: string;
  person?: string;
  email?: string;
  referrerCode?: string;
  loginId: string;
}): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();

  // 認証情報（未割り当て）の確認
  const { data: cred } = await sb
    .from("partner_credentials")
    .select("login_id, status")
    .eq("login_id", input.loginId)
    .maybeSingle();
  if (!cred) return { ok: false, message: `ログインID が見つかりません: ${input.loginId}` };
  if (cred.status !== "unassigned") return { ok: false, message: "そのログインID は既に割り当て済みです" };

  // 紹介元（親）の解決
  let parentId: string | null = null;
  let referrerName: string | undefined;
  if (input.referrerCode?.trim()) {
    const { data: parent } = await sb
      .from("partners")
      .select("id, name")
      .eq("referral_code", input.referrerCode.trim())
      .maybeSingle();
    if (!parent) return { ok: false, message: `紹介コードが見つかりません: ${input.referrerCode}` };
    parentId = parent.id;
    referrerName = parent.name;
  }

  const slug = await ensureUniqueSlug(sb, input.name);
  const referralCode = await ensureUniqueCode(sb, input.name);

  const { data: inserted, error } = await sb
    .from("partners")
    .insert({
      name: input.name,
      slug,
      parent_id: parentId,
      referral_code: referralCode,
      contact_person: input.person || null,
      contact_email: input.email || null,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !inserted) return { ok: false, message: error?.message ?? "登録に失敗しました" };

  // 認証情報を割り当て
  await sb
    .from("partner_credentials")
    .update({ partner_id: inserted.id, status: "active", assigned_at: new Date().toISOString() })
    .eq("login_id", input.loginId);

  // Notion 自動同期（NOTION_TOKEN 設定時のみ送信）
  let notionNote = "";
  const partner: Partner = {
    id: inserted.id,
    name: input.name,
    slug,
    parentId,
    referralCode,
    contact: { person: input.person, email: input.email },
    joinedAt: new Date().toISOString().slice(0, 10),
    status: "active",
  };
  try {
    const sync = await syncPartnerToNotion(partner, referrerName);
    if (sync.ok && sync.notionPageId) {
      await sb.from("partners").update({ notion_page_id: sync.notionPageId }).eq("id", inserted.id);
      notionNote = " / Notion 同期済み";
    } else {
      notionNote = ` / Notion 未同期（${sync.note ?? ""}）`;
    }
  } catch (e) {
    notionNote = ` / Notion 同期エラー（${e instanceof Error ? e.message : String(e)}）`;
  }

  return {
    ok: true,
    message: "パートナーを登録しました" + notionNote,
    detail: { 会社名: input.name, 招待コード: referralCode, 個別ページ: `/partners/${slug}`, ログインID: input.loginId },
  };
}
