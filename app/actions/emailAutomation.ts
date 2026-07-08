"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateEmailAutomation(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("store_email_automation").upsert(
    {
      store_id: storeId,
      enabled: formData.get("enabled") === "on",
      send_time: String(formData.get("send_time") ?? "10:00"),
      from_email: String(formData.get("from_email") ?? "") || null,
    },
    { onConflict: "store_id" }
  );

  if (error) {
    return { error: "保存に失敗しました：" + error.message };
  }

  revalidatePath("/step-emails");
  return { success: true };
}
