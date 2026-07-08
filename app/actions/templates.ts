"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTemplate(
  storeId: number,
  schemeStepId: number,
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient();

  const { error } = await supabase.from("follow_up_templates").upsert(
    {
      store_id: storeId,
      scheme_step_id: schemeStepId,
      phone_script: String(formData.get("phone_script") ?? "") || null,
      email_subject: String(formData.get("email_subject") ?? "") || null,
      email_body: String(formData.get("email_body") ?? "") || null,
    },
    { onConflict: "store_id,scheme_step_id" }
  );

  if (error) {
    return { error: "保存に失敗しました：" + error.message };
  }

  revalidatePath("/step-emails");
  revalidatePath("/");
  return { success: true };
}
