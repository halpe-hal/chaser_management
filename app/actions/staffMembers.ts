"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateAll() {
  revalidatePath("/staff");
  revalidatePath("/customers/new");
  revalidatePath("/customers");
  revalidatePath("/");
}

export async function createStaffMember(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "名前は必須です。" };
  }

  const { error } = await supabase.from("staff_members").insert({
    store_id: storeId,
    name,
    sort_order: Date.now(),
  });

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function updateStaffMember(staffId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "名前は必須です。" };
  }

  const { error } = await supabase.from("staff_members").update({ name }).eq("id", staffId);

  if (error) {
    return { error: "更新に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteStaffMember(staffId: number) {
  const supabase = await createClient();
  await supabase.from("staff_members").delete().eq("id", staffId);
  revalidateAll();
}
