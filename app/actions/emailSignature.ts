"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStoreSignature(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("store_email_signatures").upsert(
    {
      store_id: storeId,
      signature: String(formData.get("signature") ?? "") || null,
    },
    { onConflict: "store_id" }
  );

  if (error) {
    return { error: "保存に失敗しました：" + error.message };
  }

  revalidatePath("/step-emails");
  revalidatePath("/");
  return { success: true };
}
