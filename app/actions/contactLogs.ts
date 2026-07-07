"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContactType } from "@/lib/types";

export async function addContactLog(customerId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const contactType = String(formData.get("contact_type") ?? "") as ContactType;
  if (!["TEL_ABSENT", "TEL_NOTED", "EMAIL_SENT"].includes(contactType)) {
    return { error: "連絡種別を選択してください。" };
  }

  const { error } = await supabase.from("contact_logs").insert({
    customer_id: customerId,
    contact_type: contactType,
    note: String(formData.get("note") ?? "") || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: "履歴の追加に失敗しました：" + error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deleteContactLog(logId: number, customerId: number) {
  const supabase = await createClient();
  await supabase.from("contact_logs").delete().eq("id", logId);
  revalidatePath(`/customers/${customerId}`);
}
