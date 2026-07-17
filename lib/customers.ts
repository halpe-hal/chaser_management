import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { todayStrTokyo, nowTimeStrTokyo, addIntervalToDateStr } from "@/lib/date";
import {
  followUpBaseDate,
  isJoinedStatus,
  CUSTOMER_STATUSES,
  JOINED_STATUSES,
  type Customer,
  type ContactLog,
  type CustomerStatus,
  type FollowUpGlobalSettings,
  type FollowUpSchemeStep,
  type FollowUpTaskCompletion,
} from "@/lib/types";

const todayStr = todayStrTokyo;

// ステータスごとに、有効期限つきのステップ（例：プレオープン期間中の特別スキーム）がまだ期限内であれば
// そちらを優先して使い、通常（期限なし）のステップは一時的に使わない。期限が過ぎれば自動的に通常へ戻る。
// ダッシュボードのアラート一覧・自動送信バッチの両方から使う共通ロジック（挙動を食い違わせないため）。
export function selectEffectiveSteps(steps: FollowUpSchemeStep[], today: string): FollowUpSchemeStep[] {
  const byStatus = new Map<CustomerStatus, FollowUpSchemeStep[]>();
  for (const step of steps) {
    if (!byStatus.has(step.status)) byStatus.set(step.status, []);
    byStatus.get(step.status)!.push(step);
  }

  const result: FollowUpSchemeStep[] = [];
  for (const group of byStatus.values()) {
    const activeLimited = group.filter((s) => s.active_until && s.active_until >= today);
    result.push(...(activeLimited.length > 0 ? activeLimited : group.filter((s) => !s.active_until)));
  }
  return result;
}

export async function getBaseDateResetDate(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("follow_up_global_settings").select("*").eq("id", 1).maybeSingle();
  return (data as FollowUpGlobalSettings | null)?.base_date_reset_date ?? null;
}

// リセット日が設定されていて今日がそれを過ぎている場合、ご予約日がリセット日より前の顧客は
// 起算日をリセット日に統一する（例：プレオープン期間中に登録した顧客の起算日を、実際のオープン日に揃える）
export function resolveFollowUpBaseDate(
  customer: Pick<Customer, "status" | "reservation_date" | "pre_cancel_date">,
  resetDate: string | null,
  today: string
): string {
  if (resetDate && today >= resetDate && customer.reservation_date < resetDate) {
    return resetDate;
  }
  return followUpBaseDate(customer);
}

export function computeDueDate(step: FollowUpSchemeStep, base: string): string {
  return step.fixed_date ?? addIntervalToDateStr(base, step.days_after, step.months_after);
}

// 固定日ステップの送信タイミング（その店舗の自動送信時刻）を、今日・現在時刻がすでに過ぎているか判定する。
// 過ぎていれば「今から登録してもそのステップは届かない」ということなので、後から遅れて送るのではなく
// 対応不要（チェック済み）として扱う。
export function isFixedDateStepMissed(fixedDate: string, sendTimeHHMM: string, today: string, nowTime: string): boolean {
  if (today > fixedDate) return true;
  if (today === fixedDate && nowTime >= sendTimeHHMM) return true;
  return false;
}

// ステータス変更・新規登録の直後に呼ぶ。変更後のステータスに紐づく固定日ステップのうち、
// 送信タイミングをすでに過ぎているものを「対応完了（チェック済み・メール未送信）」として記録し、
// 自動送信バッチやアラート一覧に出てこないようにする。
export async function autoSkipPassedFixedDateSteps(
  supabase: SupabaseClient,
  storeId: number,
  customerId: number,
  status: CustomerStatus
): Promise<void> {
  if (isJoinedStatus(status)) return;

  const { data: automation } = await supabase
    .from("store_email_automation")
    .select("send_time")
    .eq("store_id", storeId)
    .maybeSingle();
  const sendTime = (automation as { send_time: string } | null)?.send_time;
  if (!sendTime) return;
  const sendTimeHHMM = sendTime.slice(0, 5);

  const { data: stepsData } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .eq("status", status)
    .not("fixed_date", "is", null);
  const today = todayStr();
  const steps = selectEffectiveSteps((stepsData ?? []) as FollowUpSchemeStep[], today);
  const nowTime = nowTimeStrTokyo();

  const missedSteps = steps.filter((step) => step.fixed_date && isFixedDateStepMissed(step.fixed_date, sendTimeHHMM, today, nowTime));
  if (missedSteps.length === 0) return;

  const nowIso = new Date().toISOString();
  await supabase.from("follow_up_task_completions").upsert(
    missedSteps.map((step) => ({
      customer_id: customerId,
      scheme_step_id: step.id,
      completed: true,
      completed_at: nowIso,
    })),
    { onConflict: "customer_id,scheme_step_id" }
  );
}

export interface DueTask {
  step: FollowUpSchemeStep;
  due_date: string;
  customer: Customer;
  email_sent_at: string | null;
}

export async function getDueFollowUpTasks(storeId: number | null): Promise<DueTask[]> {
  const supabase = await createClient();

  let customersQuery = supabase.from("customers").select("*");
  if (storeId !== null) customersQuery = customersQuery.eq("store_id", storeId);
  const { data: customersData, error: customersError } = await customersQuery;
  if (customersError) throw customersError;
  const customers = ((customersData ?? []) as Customer[]).filter((c) => !isJoinedStatus(c.status));
  if (customers.length === 0) return [];

  const { data: stepsData, error: stepsError } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .order("sort_order", { ascending: true });
  if (stepsError) throw stepsError;
  const today = todayStr();
  const steps = selectEffectiveSteps((stepsData ?? []) as FollowUpSchemeStep[], today);
  const resetDate = await getBaseDateResetDate(supabase);

  const { data: completionsData, error: completionsError } = await supabase
    .from("follow_up_task_completions")
    .select("*")
    .in("customer_id", customers.map((c) => c.id));
  if (completionsError) throw completionsError;
  const completionMap = new Map(
    ((completionsData ?? []) as FollowUpTaskCompletion[]).map((c) => [`${c.customer_id}:${c.scheme_step_id}`, c])
  );

  const result: DueTask[] = [];

  for (const customer of customers) {
    const base = resolveFollowUpBaseDate(customer, resetDate, today);
    for (const step of steps) {
      if (step.status !== customer.status) continue;
      const completion = completionMap.get(`${customer.id}:${step.id}`);
      if (completion?.completed) continue;
      const dueDate = computeDueDate(step, base);
      if (dueDate <= today) {
        result.push({ step, due_date: dueDate, customer, email_sent_at: completion?.email_sent_at ?? null });
      }
    }
  }

  result.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return result;
}

const CANCEL_STATUSES: readonly CustomerStatus[] = ["事前キャンセル", "無断キャンセル"];
// 事前キャンセル/無断キャンセルより前の段階。ここへ戻された場合は「間違えてキャンセルにしてしまった」の訂正とみなす
const BEFORE_CANCEL_STATUSES: readonly CustomerStatus[] = ["未来店", "検討"];
// 再予約済より前の段階。ここへ戻された場合は「間違えて再予約済にしてしまった」の訂正とみなす
const BEFORE_REBOOK_STATUSES: readonly CustomerStatus[] = ["未来店", "検討", "事前キャンセル", "無断キャンセル", "見込みなし（未来店）"];

export interface RebookFlagUpdates {
  ever_cancelled_at?: string | null;
  ever_rebooked_at?: string | null;
}

// ステータス変更のたびに呼ぶ。再予約率を「今のステータス分布」ではなく「一度でも事前キャンセル/無断キャンセルに
// なった人のうち、一度でも再予約済になれた人の割合」として安定して集計できるよう、変化のあった分だけ返す。
// 前段ステータスへ戻された場合はステータス訂正とみなしてフラグを解除する（誤操作の巻き戻し救済）。
export function computeRebookFlagUpdates(oldStatus: CustomerStatus, newStatus: CustomerStatus): RebookFlagUpdates {
  if (oldStatus === newStatus) return {};
  const now = new Date().toISOString();
  const updates: RebookFlagUpdates = {};

  if (CANCEL_STATUSES.includes(newStatus)) {
    updates.ever_cancelled_at = now;
  } else if (CANCEL_STATUSES.includes(oldStatus) && BEFORE_CANCEL_STATUSES.includes(newStatus)) {
    updates.ever_cancelled_at = null;
  }

  if (newStatus === "再予約済") {
    updates.ever_rebooked_at = now;
  } else if (oldStatus === "再予約済" && BEFORE_REBOOK_STATUSES.includes(newStatus)) {
    updates.ever_rebooked_at = null;
  }

  return updates;
}

export interface CustomerStepStatus {
  step: FollowUpSchemeStep;
  due_date: string;
  completed: boolean;
  email_sent_at: string | null;
}

export async function getFollowUpStepsForCustomer(customer: Customer): Promise<CustomerStepStatus[]> {
  const supabase = await createClient();

  const { data: stepsData, error: stepsError } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .eq("status", customer.status)
    .order("sort_order", { ascending: true });
  if (stepsError) throw stepsError;
  const today = todayStr();
  const steps = selectEffectiveSteps((stepsData ?? []) as FollowUpSchemeStep[], today);

  const { data: completionsData, error: completionsError } = await supabase
    .from("follow_up_task_completions")
    .select("*")
    .eq("customer_id", customer.id);
  if (completionsError) throw completionsError;
  const completionMap = new Map(
    ((completionsData ?? []) as FollowUpTaskCompletion[]).map((c) => [c.scheme_step_id, c])
  );

  const resetDate = await getBaseDateResetDate(supabase);
  const base = resolveFollowUpBaseDate(customer, resetDate, today);

  return steps.map((step) => {
    const completion = completionMap.get(step.id);
    return {
      step,
      due_date: computeDueDate(step, base),
      completed: completion?.completed ?? false,
      email_sent_at: completion?.email_sent_at ?? null,
    };
  });
}

export type StatusCounts = Record<CustomerStatus, number> & {
  total: number;
  everCancelled: number; // 一度でも事前キャンセル/無断キャンセルになった人数（再予約率の分母）
  everCancelledAndRebooked: number; // そのうち一度でも再予約済になれた人数（再予約率の分子）
};

export interface StatusCountsFilters {
  dateFrom?: string;
  dateTo?: string;
}

export async function getStatusCounts(storeId: number | null, filters: StatusCountsFilters = {}): Promise<StatusCounts> {
  const supabase = await createClient();
  let query = supabase.from("customers").select("status, ever_cancelled_at, ever_rebooked_at");
  if (storeId !== null) query = query.eq("store_id", storeId);
  if (filters.dateFrom) query = query.gte("reservation_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("reservation_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Pick<Customer, "status" | "ever_cancelled_at" | "ever_rebooked_at">[];
  return buildStatusCounts(rows);
}

// 手元にある顧客一覧（例: 特定日の予約分）から、DBに問い合わせ直さずにステータス件数を集計する
export function buildStatusCounts(
  customers: (Pick<Customer, "status"> & Partial<Pick<Customer, "ever_cancelled_at" | "ever_rebooked_at">>)[]
): StatusCounts {
  const counts = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0])) as StatusCounts;
  counts.total = customers.length;
  counts.everCancelled = 0;
  counts.everCancelledAndRebooked = 0;
  for (const c of customers) {
    if (c.ever_cancelled_at) {
      counts.everCancelled++;
      if (c.ever_rebooked_at) counts.everCancelledAndRebooked++;
    }
    counts[c.status]++;
  }
  return counts;
}

export interface StaffJoinRate {
  staffId: number | null;
  staffName: string;
  visited: number; // 来店率の分子と同じ定義（検討＋入会＋見込みなし（来店済）の人数）
  joinRate: number | null; // 0-100（visitedが0のときは null）
}

// スタッフごとの入会率（来店した人数に対する入会人数の割合）を集計する
export async function getStaffJoinRatesByStaff(
  storeId: number | null,
  filters: StatusCountsFilters = {}
): Promise<StaffJoinRate[]> {
  const supabase = await createClient();
  let query = supabase.from("customers").select("status, staff_member_id");
  if (storeId !== null) query = query.eq("store_id", storeId);
  if (filters.dateFrom) query = query.gte("reservation_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("reservation_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as { status: CustomerStatus; staff_member_id: number | null }[];

  const byStaff = new Map<number | null, { status: CustomerStatus }[]>();
  for (const row of rows) {
    if (!byStaff.has(row.staff_member_id)) byStaff.set(row.staff_member_id, []);
    byStaff.get(row.staff_member_id)!.push({ status: row.status });
  }

  let staffNames = new Map<number, string>();
  if (storeId !== null) {
    const { data: staffData } = await supabase
      .from("staff_members")
      .select("id, name")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });
    staffNames = new Map(((staffData ?? []) as { id: number; name: string }[]).map((s) => [s.id, s.name]));
  }

  const result: StaffJoinRate[] = [];
  for (const [staffId, group] of byStaff.entries()) {
    const { visited, joined } = countVisitedAndJoined(buildStatusCounts(group));
    result.push({
      staffId,
      staffName: staffId !== null ? staffNames.get(staffId) ?? "（削除済みスタッフ）" : "未設定",
      visited,
      joinRate: visited > 0 ? (joined / visited) * 100 : null,
    });
  }

  result.sort((a, b) => {
    if (a.staffId === null) return 1;
    if (b.staffId === null) return -1;
    return a.staffId - b.staffId;
  });

  return result;
}

export interface DashboardStats {
  totalReservations: number;
  visitedCount: number; // 来店率の分子と同じ人数（検討＋入会全プラン＋見込みなし（来店済））
  memberCount: number; // 入会ステータス（２年・1年・通常）の合計
  visitRate: number | null; // 0-100（対象0件のときは null）
  joinRate: number | null; // 0-100（対象0件のときは null）
  rebookRate: number | null; // 0-100（対象0件のときは null）
}

// 来店率は「未来店」（まだ来店予定日を迎えていない）と「再予約済」（結果が別の予約に持ち越し）を
// 母数から除いた、結果が確定している予約に対する割合として算出する。
// 「見込みなし（未来店）」は事前キャンセル・無断キャンセルと同じ「来店しなかった」側として扱う。
// 入会率は、さらに来店しなかった側も母数から除いた（＝実際に来店した人数に対する）割合とする。
// 再予約率は、現在のステータス分布ではなく ever_cancelled_at/ever_rebooked_at フラグで算出する。
// 一度でも事前キャンセル/無断キャンセルになった人のうち、一度でも再予約済になれた人の割合。
// こうすることで、その後ステータスが入会・見込みなし等に進んでも率が変動しない（computeRebookFlagUpdates参照）。
// 来店した人数（検討＋入会全プラン＋見込みなし（来店済））と、そのうち入会した人数を求める
function countVisitedAndJoined(counts: StatusCounts): { visited: number; joined: number } {
  const joined = JOINED_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const notUpcoming = counts.total - counts["未来店"];
  const visitDenominator = notUpcoming - counts["再予約済"];
  const didNotVisit = counts["事前キャンセル"] + counts["無断キャンセル"] + counts["見込みなし（未来店）"];
  return { visited: visitDenominator - didNotVisit, joined };
}

export function computeDashboardStats(counts: StatusCounts): DashboardStats {
  const notUpcoming = counts.total - counts["未来店"];
  const visitDenominator = notUpcoming - counts["再予約済"];
  const { visited, joined } = countVisitedAndJoined(counts);

  return {
    totalReservations: counts.total,
    visitedCount: visited,
    memberCount: joined,
    visitRate: visitDenominator > 0 ? (visited / visitDenominator) * 100 : null,
    joinRate: visited > 0 ? (joined / visited) * 100 : null,
    rebookRate: counts.everCancelled > 0 ? (counts.everCancelledAndRebooked / counts.everCancelled) * 100 : null,
  };
}

export type CustomerSortBy = "reservation_date" | "created_at";

export interface CustomerListFilters {
  status?: CustomerStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CustomerSortBy;
  staffId?: number | "all";
}

export async function getCustomers(storeId: number | null, filters: CustomerListFilters = {}): Promise<Customer[]> {
  const supabase = await createClient();
  const sortBy = filters.sortBy === "created_at" ? "created_at" : "reservation_date";
  let query = supabase.from("customers").select("*").order(sortBy, { ascending: false });

  if (storeId !== null) query = query.eq("store_id", storeId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters.dateFrom) query = query.gte("reservation_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("reservation_date", filters.dateTo);
  if (filters.staffId && filters.staffId !== "all") query = query.eq("staff_member_id", filters.staffId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

// ペアでご来店の同伴者（この顧客に紐付いている別の顧客レコード）を取得する
export async function getCompanions(customerId: number): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("paired_customer_id", customerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export interface RebookMatch {
  id: number;
  created_at: string;
}

// メール・CSV取り込みで新しい予約が入った際、電話番号かメールアドレスが一致する既存顧客（まだ再予約済でないもの）を、
// 作成日時が新しい順に返す。呼び出し側は先頭（最新）を新しい予約情報へ移動させる対象として使う。
export async function findRebookMatches(
  supabase: SupabaseClient,
  storeId: number,
  contact: { email: string | null; phone: string | null }
): Promise<RebookMatch[]> {
  if (!contact.email && !contact.phone) return [];

  const { data } = await supabase
    .from("customers")
    .select("id, email, phone, status, created_at")
    .eq("store_id", storeId);

  return ((data ?? []) as { id: number; email: string | null; phone: string | null; status: CustomerStatus; created_at: string }[])
    .filter(
      (c) =>
        c.status !== "再予約済" &&
        ((contact.email && c.email === contact.email) || (contact.phone && c.phone === contact.phone))
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ id: c.id, created_at: c.created_at }));
}

export async function getContactLogs(customerId: number): Promise<ContactLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_logs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContactLog[];
}
