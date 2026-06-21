"use server";
// スタッフ操作のサーバアクション。スタッフセッションでゲートし、service_role で書き込む。
// （ブラウザに合言葉や service_role を渡さない）
import { getServerClient, hasServerSupabase } from "@/lib/db/supabase";
import { requireStaff } from "@/lib/auth/server";
import { generateReferralCode, randomCode, slugify } from "@/lib/referral-code";
import { generatePassword } from "@/lib/credentials";
import { syncPartnerToNotion } from "@/lib/integrations/notion";
import { sendCredentialsEmail } from "@/lib/integrations/email";
import { mergeRewards } from "@/lib/rates";
import type { DealStatus, Partner, Tier, TierReward } from "@/lib/types";

interface RewardRow {
  service_id?: string;
  tier: number;
  type: "percentage" | "fixed";
  rate: number | null;
  fixed_amount: number | null;
}
function rowToReward(r: RewardRow): TierReward {
  return { tier: r.tier as Tier, type: r.type, rate: r.rate ?? undefined, fixedAmount: r.fixed_amount ?? undefined };
}

/** 成約時点の料率スナップショットを解決（サービス既定 ← 紹介者の料率パターンで上書き） */
async function resolveRewardSnapshot(
  sb: ReturnType<typeof getServerClient>,
  serviceId: string,
  introducerPartnerId: string
): Promise<TierReward[]> {
  const { data: base } = await sb.from("service_rewards").select("*").eq("service_id", serviceId);
  const baseRewards = ((base ?? []) as RewardRow[]).map(rowToReward);

  const { data: partner } = await sb
    .from("partners").select("rate_plan_id").eq("id", introducerPartnerId).maybeSingle();
  const planId = (partner as { rate_plan_id: string | null } | null)?.rate_plan_id;
  if (!planId) return baseRewards;

  const { data: override } = await sb
    .from("rate_plan_rewards").select("*").eq("plan_id", planId).eq("service_id", serviceId);
  const overrideRewards = ((override ?? []) as RewardRow[]).map(rowToReward);
  return mergeRewards(baseRewards, overrideRewards);
}

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
  const snapshot = await resolveRewardSnapshot(sb, input.serviceId, input.introducerPartnerId);
  const { error } = await sb.from("deals").insert({
    service_id: input.serviceId,
    client_name: input.clientName,
    introducer_partner_id: input.introducerPartnerId,
    amount: input.amount,
    status: input.status,
    closed_at: input.closedAt,
    is_self_deal: input.isSelfDeal,
    note: input.note || null,
    reward_snapshot: snapshot,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "成約を登録しました（料率を記録）" };
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

async function ensureUniqueLoginId(
  sb: ReturnType<typeof getServerClient>,
  desired?: string
): Promise<{ loginId: string; error?: string }> {
  // 指定があればそれを使う（未割り当て or 未登録のみ許可）
  if (desired?.trim()) {
    const id = desired.trim();
    const { data } = await sb
      .from("partner_credentials")
      .select("login_id, status")
      .eq("login_id", id)
      .maybeSingle();
    if (data && data.status !== "unassigned") {
      return { loginId: id, error: "そのログインID は既に使用中です" };
    }
    return { loginId: id };
  }
  // 自動採番（LET-P-XXXXX, 衝突回避）
  for (let i = 0; i < 30; i++) {
    const id = `LET-P-${randomCode(5)}`;
    const { data } = await sb.from("partner_credentials").select("login_id").eq("login_id", id).maybeSingle();
    if (!data) return { loginId: id };
  }
  return { loginId: `LET-P-${Date.now().toString(36).toUpperCase()}` };
}

export async function registerPartner(input: {
  name: string;
  person?: string;
  email?: string;
  referrerCode?: string;
  /** 任意。空欄なら自動採番 */
  loginId?: string;
}): Promise<ActionResult> {
  await requireStaff();
  if (!hasServerSupabase()) return { ok: false, message: "Supabase 未設定です" };
  const sb = getServerClient();

  // ログインID（指定 or 自動採番）
  const { loginId, error: idErr } = await ensureUniqueLoginId(sb, input.loginId);
  if (idErr) return { ok: false, message: idErr };

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
  const password = generatePassword();

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

  // パスワードを生成・ハッシュ化して認証情報を発行（DB側 crypt）
  const { error: credErr } = await sb.rpc("set_credential", {
    p_login_id: loginId,
    p_password: password,
    p_partner_id: inserted.id,
  });
  if (credErr) return { ok: false, message: `認証情報の発行に失敗: ${credErr.message}` };

  // Notion 自動同期（NOTION_TOKEN 設定時のみ）
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
      notionNote = " / Notion 未同期";
    }
  } catch {
    notionNote = " / Notion 同期エラー";
  }

  // ログイン情報をメール送信（未設定 or 宛先なしなら送らず、画面表示にフォールバック）
  const mail = await sendCredentialsEmail({ to: input.email ?? "", companyName: input.name, loginId, password });
  const emailNote = mail.sent ? "メール送信済み" : `メール未送信（${mail.note ?? ""}）`;

  return {
    ok: true,
    message: `パートナーを登録しました（${emailNote}）` + notionNote,
    detail: {
      会社名: input.name,
      招待コード: referralCode,
      個別ページ: `/partners/${slug}`,
      ログインID: loginId,
      // メール送信できた場合はパスワードを画面に出さない
      ...(mail.sent ? {} : { パスワード: password }),
      メール: mail.sent ? `送信済み（${input.email}）` : "未送信（下記を手動連絡）",
    },
  };
}
