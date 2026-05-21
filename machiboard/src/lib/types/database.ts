export type OrganizationType = "自治会" | "町内会" | "管理組合" | "その他";
export type MemberRole = "admin" | "member";
export type BulletinCategory = "general" | "garbage" | "disaster" | "event" | "important";
export type BulletinPriority = "normal" | "high" | "urgent";
export type SubscriptionTier = "free" | "mini" | "standard" | "premium";
export type FontSizePreference = "default" | "large" | "xlarge";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  postal_code: string | null;
  address: string | null;
  household_count: number;
  invite_code: string;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  locale: string;
  font_size_preference: FontSizePreference;
  high_contrast: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
  organization?: Organization;
}

export interface Bulletin {
  id: string;
  organization_id: string;
  author_id: string;
  title: string;
  content: string;
  category: BulletinCategory;
  priority: BulletinPriority;
  image_urls: string[];
  attachment_urls: string[];
  pdf_url: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  is_draft: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  read_count?: number;
  member_count?: number;
  is_read?: boolean;
}

export interface ReadConfirmation {
  id: string;
  bulletin_id: string;
  user_id: string;
  read_at: string;
  profile?: Profile;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  line_enabled: boolean;
  line_user_id: string | null;
  push_subscription: Record<string, unknown> | null;
}

// Category display config
export const CATEGORY_CONFIG: Record<BulletinCategory, { label: string; color: string; bg: string }> = {
  general: { label: "一般連絡", color: "text-neutral-700", bg: "bg-neutral-100" },
  garbage: { label: "ゴミ収集", color: "text-green-800", bg: "bg-green-100" },
  disaster: { label: "防災", color: "text-red-800", bg: "bg-red-100" },
  event: { label: "イベント", color: "text-purple-700", bg: "bg-purple-100" },
  important: { label: "重要", color: "text-amber-800", bg: "bg-amber-100" },
};
