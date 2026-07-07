"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/schemes");
  revalidatePath("/templates");
  revalidatePath("/");
}

function readInterval(formData: FormData): { error?: string; daysAfter: number; monthsAfter: number } {
  const unit = String(formData.get("unit") ?? "day");
  const value = Number(formData.get("value"));

  if (Number.isNaN(value) || value < 0) {
    return { error: "経過日数・月数は必須です。", daysAfter: 0, monthsAfter: 0 };
  }

  return unit === "month" ? { daysAfter: 0, monthsAfter: value } : { daysAfter: value, monthsAfter: 0 };
}

export async function createSchemeStep(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const status = String(formData.get("status") ?? "") as CustomerStatus;
  const label = String(formData.get("label") ?? "").trim();
  const { error: intervalError, daysAfter, monthsAfter } = readInterval(formData);

  if (!status || intervalError || !label) {
    return { error: intervalError ?? "ステータス・ラベルは必須です。" };
  }

  const { error } = await supabase.from("follow_up_scheme_steps").insert({
    status,
    days_after: daysAfter,
    months_after: monthsAfter,
    label,
    use_phone: formData.get("use_phone") === "on",
    use_email: formData.get("use_email") === "on",
    sort_order: daysAfter + monthsAfter * 30,
  });

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function updateSchemeStep(stepId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const label = String(formData.get("label") ?? "").trim();
  const { error: intervalError, daysAfter, monthsAfter } = readInterval(formData);

  if (intervalError || !label) {
    return { error: intervalError ?? "ラベルは必須です。" };
  }

  const { error } = await supabase
    .from("follow_up_scheme_steps")
    .update({
      days_after: daysAfter,
      months_after: monthsAfter,
      label,
      use_phone: formData.get("use_phone") === "on",
      use_email: formData.get("use_email") === "on",
      sort_order: daysAfter + monthsAfter * 30,
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
