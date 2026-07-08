import { createClient } from "@/lib/supabase/server";
import { todayStrTokyo, addIntervalToDateStr } from "@/lib/date";
import {
  followUpBaseDate,
  isJoinedStatus,
  CUSTOMER_STATUSES,
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

export interface CustomerListFilters {
  status?: CustomerStatus | "all";
  search?: string;
}

export async function getCustomers(storeId: number | null, filters: CustomerListFilters = {}): Promise<Customer[]> {
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("reservation_date", { ascending: false });

  if (storeId !== null) query = query.eq("store_id", storeId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

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
