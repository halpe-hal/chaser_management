import { createClient } from "@/lib/supabase/server";
import type { StaffMember } from "@/lib/types";

export async function getStaffMembers(storeId: number): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StaffMember[];
}

// 複数店舗ぶんの対応スタッフを store_id ごとにまとめて取得する（新規登録フォームの店舗切り替え用）
export async function getStaffMembersByStore(storeIds: number[]): Promise<Record<number, StaffMember[]>> {
  if (storeIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .in("store_id", storeIds)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const byStore: Record<number, StaffMember[]> = {};
  for (const row of (data ?? []) as StaffMember[]) {
    (byStore[row.store_id] ??= []).push(row);
  }
  return byStore;
}
