import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { todayStrTokyo, addIntervalToDateStr } from "@/lib/date";
import {
  followUpBaseDate,
  isJoinedStatus,
  CUSTOMER_STATUSES,
  JOINED_STATUSES,
  type Customer,
  type ContactLog,
  type CustomerStatus,
  type FollowUpSchemeStep,
  type FollowUpTaskCompletion,
} from "@/lib/types";

const todayStr = todayStrTokyo;

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
  const steps = (stepsData ?? []) as FollowUpSchemeStep[];

  const { data: completionsData, error: completionsError } = await supabase
    .from("follow_up_task_completions")
    .select("*")
    .in("customer_id", customers.map((c) => c.id));
  if (completionsError) throw completionsError;
  const completionMap = new Map(
    ((completionsData ?? []) as FollowUpTaskCompletion[]).map((c) => [`${c.customer_id}:${c.scheme_step_id}`, c])
  );

  const today = todayStr();
  const result: DueTask[] = [];

  for (const customer of customers) {
    const base = followUpBaseDate(customer);
    for (const step of steps) {
      if (step.status !== customer.status) continue;
      const completion = completionMap.get(`${customer.id}:${step.id}`);
      if (completion?.completed) continue;
      const dueDate = addIntervalToDateStr(base, step.days_after, step.months_after);
      if (dueDate <= today) {
        result.push({ step, due_date: dueDate, customer, email_sent_at: completion?.email_sent_at ?? null });
      }
    }
  }

  result.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return result;
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
  const steps = (stepsData ?? []) as FollowUpSchemeStep[];

  const { data: completionsData, error: completionsError } = await supabase
    .from("follow_up_task_completions")
    .select("*")
    .eq("customer_id", customer.id);
  if (completionsError) throw completionsError;
  const completionMap = new Map(
    ((completionsData ?? []) as FollowUpTaskCompletion[]).map((c) => [c.scheme_step_id, c])
  );

  const base = followUpBaseDate(customer);

  return steps.map((step) => {
    const completion = completionMap.get(step.id);
    return {
      step,
      due_date: addIntervalToDateStr(base, step.days_after, step.months_after),
      completed: completion?.completed ?? false,
      email_sent_at: completion?.email_sent_at ?? null,
    };
  });
}

export type StatusCounts = Record<CustomerStatus, number> & { total: number };

export async function getStatusCounts(storeId: number | null): Promise<StatusCounts> {
  const supabase = await createClient();
  let query = supabase.from("customers").select("status");
  if (storeId !== null) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as { status: CustomerStatus }[];
  const counts = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0])) as StatusCounts;
  counts.total = rows.length;
  for (const row of rows) {
    counts[row.status]++;
  }
  return counts;
}

export interface DashboardStats {
  totalReservations: number;
  visitRate: number | null; // 0-100（対象0件のときは null）
  joinRate: number | null; // 0-100（対象0件のときは null）
}

// 来店率は「未来店」（まだ来店予定日を迎えていない）と「再予約済」（結果が別の予約に持ち越し）を
// 母数から除いた、結果が確定している予約に対する割合として算出する。
// 入会率は、さらに事前キャンセル・無断キャンセルも母数から除いた（＝実際に来店した人数に対する）割合とする。
export function computeDashboardStats(counts: StatusCounts): DashboardStats {
  const joined = JOINED_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const notUpcoming = counts.total - counts["未来店"];
  const visitDenominator = notUpcoming - counts["再予約済"];
  const visited = visitDenominator - counts["事前キャンセル"] - counts["無断キャンセル"];

  return {
    totalReservations: counts.total,
    visitRate: visitDenominator > 0 ? (visited / visitDenominator) * 100 : null,
    joinRate: visited > 0 ? (joined / visited) * 100 : null,
  };
}

export type CustomerSortBy = "reservation_date" | "created_at";

export interface CustomerListFilters {
  status?: CustomerStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CustomerSortBy;
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
