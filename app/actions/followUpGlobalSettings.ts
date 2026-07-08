"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateBaseDateResetDate(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const baseDateResetDate = String(formData.get("base_date_reset_date") ?? "").trim() || null;

  const { error } = await supabase
    .from("follow_up_global_settings")
    .upsert({ id: 1, base_date_reset_date: baseDateResetDate }, { onConflict: "id" });

  if (error) {
    return { error: "保存に失敗しました：" + error.message };
  }

  revalidatePath("/step-emails");
  revalidatePath("/");
  return { success: true };
}
