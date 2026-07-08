import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Customer, StoreScheduleCapacityOverride, StoreScheduleSettings, StoreTimeSlot } from "@/lib/types";

const DEFAULT_CAPACITY = 3;

async function resolveClient(client?: SupabaseClient): Promise<SupabaseClient> {
  return client ?? ((await createClient()) as unknown as SupabaseClient);
}

// 店舗の基本の同時受け入れ人数（期間別の上書きを考慮しない値）
export async function getDefaultScheduleCapacity(storeId: number, client?: SupabaseClient): Promise<number> {
  const supabase = await resolveClient(client);
  const { data } = await supabase
    .from("store_schedule_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  return (data as StoreScheduleSettings | null)?.capacity ?? DEFAULT_CAPACITY;
}

export async function getCapacityOverrides(
  storeId: number,
  client?: SupabaseClient
): Promise<StoreScheduleCapacityOverride[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("store_schedule_capacity_overrides")
    .select("*")
    .eq("store_id", storeId)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoreScheduleCapacityOverride[];
}

function daysBetween(start: string, end: string): number {
  return (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000;
}

// 指定日に該当する期間別の上書き設定があればその人数、なければ基本人数を返す。
// 複数の上書きが同じ日に該当する場合は、範囲が最も狭いものを優先する。
export function resolveCapacityForDate(
  dateStr: string,
  overrides: StoreScheduleCapacityOverride[],
  defaultCapacity: number
): number {
  const matches = overrides.filter((o) => o.start_date <= dateStr && dateStr <= o.end_date);
  if (matches.length === 0) return defaultCapacity;
  matches.sort((a, b) => daysBetween(a.start_date, a.end_date) - daysBetween(b.start_date, b.end_date));
  return matches[0].capacity;
}

export async function getScheduleCapacityForDate(storeId: number, dateStr: string, client?: SupabaseClient): Promise<number> {
  const supabase = await resolveClient(client);
  const [defaultCapacity, overrides] = await Promise.all([
    getDefaultScheduleCapacity(storeId, supabase),
    getCapacityOverrides(storeId, supabase),
  ]);
  return resolveCapacityForDate(dateStr, overrides, defaultCapacity);
}

export async function getAllTimeSlots(storeId: number, client?: SupabaseClient): Promise<StoreTimeSlot[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("store_time_slots")
    .select("*")
    .eq("store_id", storeId)
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoreTimeSlot[];
}

export interface ScheduleRow {
  time: string; // "HH:mm"
  isOpen: boolean; // その曜日にこの時間が受付対象かどうか
}

// その店舗で1度でも設定された時間に加え、その日に実際に予約が入っている時間（設定にない時間でも）を
// 行として使い、指定日の曜日で開いているかどうかを判定する（開いていない行はグレー表示用）。
// 設定外の時間に予約が入っているケース（既存顧客の予約時間を後から入力した場合など）でも
// 予約自体は必ず表に表示されるようにするため。
export function buildScheduleRows(allSlots: StoreTimeSlot[], dayOfWeek: number, extraTimes: string[] = []): ScheduleRow[] {
  const configuredTimes = allSlots.map((s) => s.time.slice(0, 5));
  const times = Array.from(new Set([...configuredTimes, ...extraTimes.map((t) => t.slice(0, 5))])).sort();
  const openTimesForDay = new Set(
    allSlots.filter((s) => s.day_of_week === dayOfWeek).map((s) => s.time.slice(0, 5))
  );
  return times.map((time) => ({ time, isOpen: openTimesForDay.has(time) }));
}

export async function getReservationsForDate(storeId: number, dateStr: string, client?: SupabaseClient): Promise<Customer[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("reservation_date", dateStr)
    .order("reservation_time", { ascending: true })
    .order("slot_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

// 指定の店舗・日付・時間で、空いている予約枠番号(1..capacity)を1つ確保する。満席の場合は null を返す。
export async function assignSlotNumber(
  supabase: SupabaseClient,
  storeId: number,
  date: string,
  time: string,
  capacity: number,
  excludeCustomerId?: number
): Promise<number | null> {
  let query = supabase
    .from("customers")
    .select("slot_number")
    .eq("store_id", storeId)
    .eq("reservation_date", date)
    .eq("reservation_time", time)
    .not("slot_number", "is", null);
  if (excludeCustomerId) query = query.neq("id", excludeCustomerId);

  const { data } = await query;
  const used = new Set((data ?? []).map((r) => r.slot_number as number));

  for (let slot = 1; slot <= capacity; slot++) {
    if (!used.has(slot)) return slot;
  }
  return null;
}
