export type CustomerStatus =
  | "未来店"
  | "入会（２年）"
  | "入会（1年）"
  | "入会（通常）"
  | "検討"
  | "再予約済"
  | "事前キャンセル"
  | "無断キャンセル";

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "未来店",
  "入会（２年）",
  "入会（1年）",
  "入会（通常）",
  "検討",
  "再予約済",
  "事前キャンセル",
  "無断キャンセル",
];

export const JOINED_STATUSES: CustomerStatus[] = ["入会（２年）", "入会（1年）", "入会（通常）"];

export function isJoinedStatus(status: CustomerStatus): boolean {
  return (JOINED_STATUSES as string[]).includes(status);
}

export interface Customer {
  id: number;
  store_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  reservation_date: string;
  status: CustomerStatus;
  pre_cancel_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactType = "TEL_ABSENT" | "TEL_NOTED" | "EMAIL_SENT";

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  TEL_ABSENT: "TEL：不在",
  TEL_NOTED: "TEL：内容記載",
  EMAIL_SENT: "メール済み",
};

export interface ContactLog {
  id: number;
  customer_id: number;
  contact_type: ContactType;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

// ステータスごとに管理者が自由に登録・編集・削除できる追客スキームの1ステップ
export interface FollowUpSchemeStep {
  id: number;
  status: CustomerStatus;
  days_after: number;
  months_after: number;
  label: string;
  use_phone: boolean;
  use_email: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpTaskCompletion {
  id: number;
  customer_id: number;
  scheme_step_id: number;
  completed: boolean;
  completed_at: string | null;
  email_sent_at: string | null;
}

export interface FollowUpTemplate {
  store_id: number;
  scheme_step_id: number;
  phone_script: string | null;
  email_subject: string | null;
  email_body: string | null;
  updated_at: string;
}

export interface StoreEmailSignature {
  store_id: number;
  signature: string | null;
  updated_at: string;
}

export interface StoreEmailAutomation {
  store_id: number;
  enabled: boolean;
  send_time: string; // "HH:mm:ss"
  from_email: string | null;
  last_run_date: string | null;
  updated_at: string;
}

// 顧客の起算日（事前キャンセルなら事前キャンセル日、それ以外はご予約日）
export function followUpBaseDate(customer: Pick<Customer, "status" | "reservation_date" | "pre_cancel_date">): string {
  if (customer.status === "事前キャンセル" && customer.pre_cancel_date) {
    return customer.pre_cancel_date;
  }
  return customer.reservation_date;
}

// メールテンプレート内の {{name}} をお客様名に置き換え、署名を末尾に付加する
export function renderEmailBody(body: string | null, customerName: string, signature: string | null): string {
  const withName = (body ?? "").replaceAll("{{name}}", customerName);
  if (!signature) return withName;
  return `${withName}\n\n${signature}`;
}

export function renderEmailSubject(subject: string | null, customerName: string): string {
  return (subject ?? "").replaceAll("{{name}}", customerName);
}
