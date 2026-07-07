"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/schemes");
  revalidatePath("/templates");
  revalidatePath("/");
}

export async function createSchemeStep(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const status = String(formData.get("status") ?? "") as CustomerStatus;
  const daysAfter = Number(formData.get("days_after"));
  const label = String(formData.get("label") ?? "").trim();

  if (!status || Number.isNaN(daysAfter) || daysAfter < 0 || !label) {
    return { error: "ステータス・経過日数・ラベルは必須です。" };
  }

  const { error } = await supabase.from("follow_up_scheme_steps").insert({
    status,
    days_after: daysAfter,
    label,
    use_phone: formData.get("use_phone") === "on",
    use_email: formData.get("use_email") === "on",
    sort_order: daysAfter,
  });

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function updateSchemeStep(stepId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const daysAfter = Number(formData.get("days_after"));
  const label = String(formData.get("label") ?? "").trim();

  if (Number.isNaN(daysAfter) || daysAfter < 0 || !label) {
    return { error: "経過日数・ラベルは必須です。" };
  }

  const { error } = await supabase
    .from("follow_up_scheme_steps")
    .update({
      days_after: daysAfter,
      label,
      use_phone: formData.get("use_phone") === "on",
      use_email: formData.get("use_email") === "on",
      sort_order: daysAfter,
    })
    .eq("id", stepId);

  if (error) {
    return { error: "更新に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteSchemeStep(stepId: number) {
  const supabase = await createClient();
  await supabase.from("follow_up_scheme_steps").delete().eq("id", stepId);
  revalidateAll();
}
