export type CustomerStatus =
  | "未来店"
  | "入会（２年）"
  | "入会（1年）"
  | "入会（通常）"
  | "検討"
  | "再予約済"
  | "事前キャンセル"
  | "無断キャンセル"
  | "見込みなし（来店済）"
  | "見込みなし（未来店）";

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "未来店",
  "入会（２年）",
  "入会（1年）",
  "入会（通常）",
  "検討",
  "事前キャンセル",
  "無断キャンセル",
  "再予約済",
  "見込みなし（来店済）",
  "見込みなし（未来店）",
];

// 追客スキーム・テンプレート管理の対象は「来店後もフォローが必要なステータス」のみに絞る
export const FOLLOWUP_STATUSES: CustomerStatus[] = ["検討", "事前キャンセル", "無断キャンセル"];

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
  reservation_time: string | null; // "HH:mm:ss"
  reservation_end_time: string | null; // "HH:mm:ss"
  slot_number: number | null;
  status: CustomerStatus;
  pre_cancel_date: string | null;
  consideration_reason: string | null;
  staff_member_id: number | null;
  // ペアでご来店の同伴者を、別の顧客レコードとしてこの顧客に紐付ける場合の参照先ID
  paired_customer_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// 店舗ごとに管理者が設定する予約枠（曜日ごとの受付時間）
export interface StoreTimeSlot {
  id: number;
  store_id: number;
  day_of_week: number; // 0=日 1=月 ... 6=土
  time: string; // "HH:mm:ss"
  sort_order: number;
  created_at: string;
}

// 店舗ごとの同時受け入れ人数（予約表の列数）の基本値
export interface StoreScheduleSettings {
  store_id: number;
  capacity: number;
  updated_at: string;
}

// 特定期間だけ基本人数を上書きする設定（例：6/27〜28のみ5名）
export interface StoreScheduleCapacityOverride {
  id: number;
  store_id: number;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  capacity: number;
  created_at: string;
}

// 店舗ごとに管理者が登録・編集・削除できる対応スタッフ
export interface StaffMember {
  id: number;
  store_id: number;
  name: string;
  sort_order: number;
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
  // 設定した場合、この日までの期間限定スキームとなる（例：プレオープン期間中の特別対応）。
  // 同じステータスに有効期限つきのステップがあり、今日がその期限内であれば、通常（期限なし）のステップより優先して使われる。
  active_until: string | null;
  // 設定した場合、経過日数ではなくこの日付そのものが送信予定日になる（固定日ステップ）
  fixed_date: string | null;
  created_at: string;
  updated_at: string;
}

// 全ステータス共通のグローバル設定（追客ステップの起算日リセット日など）
export interface FollowUpGlobalSettings {
  id: number;
  // 設定した場合、この日を過ぎるとご予約日がこの日より前の顧客は、追客ステップの起算日がこの日にリセットされる
  base_date_reset_date: string | null;
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
