"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus, FollowUpSchemeStep, FollowUpTemplate } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/step-emails");
  revalidatePath("/");
}

function readInterval(formData: FormData): { error?: string; daysAfter: number; monthsAfter: number } {
  const unit = String(formData.get("unit") ?? "day");
  const valueRaw = String(formData.get("value") ?? "").trim();
  const fixedDate = String(formData.get("fixed_date") ?? "").trim();

  if (!valueRaw) {
    if (fixedDate) return { daysAfter: 0, monthsAfter: 0 };
    return { error: "経過日数・月数、または固定日のいずれかは必須です。", daysAfter: 0, monthsAfter: 0 };
  }

  const value = Number(valueRaw);
  if (Number.isNaN(value) || value < 0) {
    return { error: "経過日数・月数は必須です。", daysAfter: 0, monthsAfter: 0 };
  }

  return unit === "month" ? { daysAfter: 0, monthsAfter: value } : { daysAfter: value, monthsAfter: 0 };
}

// 固定日ステップは、経過日数ベースのステップより後ろに（日付の昇順で）並ぶようにする
function computeSortOrder(daysAfter: number, monthsAfter: number, fixedDate: string | null): number {
  if (fixedDate) {
    return Math.round(new Date(`${fixedDate}T00:00:00Z`).getTime() / 86400000);
  }
  return daysAfter + monthsAfter * 30;
}

export async function createSchemeStep(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const status = String(formData.get("status") ?? "") as CustomerStatus;
  const label = String(formData.get("label") ?? "").trim();
  const activeUntil = String(formData.get("active_until") ?? "").trim() || null;
  const fixedDate = String(formData.get("fixed_date") ?? "").trim() || null;
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
    sort_order: computeSortOrder(daysAfter, monthsAfter, fixedDate),
    active_until: activeUntil,
    fixed_date: fixedDate,
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
  const activeUntil = String(formData.get("active_until") ?? "").trim() || null;
  const fixedDate = String(formData.get("fixed_date") ?? "").trim() || null;
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
      sort_order: computeSortOrder(daysAfter, monthsAfter, fixedDate),
      active_until: activeUntil,
      fixed_date: fixedDate,
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

// あるステータスのスキーム（ステップ構成＋全店舗分のテンプレート内容）を、別のステータスへコピーする。
// コピー先の既存のステップ（およびそれに紐づくテンプレート・完了記録）は削除してから上書きする。
export async function copySchemeToStatus(
  fromStatus: CustomerStatus,
  toStatus: CustomerStatus
): Promise<{ error?: string; success?: boolean }> {
  if (fromStatus === toStatus) {
    return { error: "コピー元とコピー先が同じです。" };
  }

  const supabase = await createClient();

  const { data: fromStepsData, error: fromStepsError } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .eq("status", fromStatus)
    .order("sort_order", { ascending: true });
  if (fromStepsError) {
    return { error: "コピー元の取得に失敗しました：" + fromStepsError.message };
  }
  const fromSteps = (fromStepsData ?? []) as FollowUpSchemeStep[];
  if (fromSteps.length === 0) {
    return { error: "コピー元にステップが登録されていません。" };
  }

  const { data: toStepsData, error: toStepsError } = await supabase
    .from("follow_up_scheme_steps")
    .select("id")
    .eq("status", toStatus);
  if (toStepsError) {
    return { error: "コピー先の取得に失敗しました：" + toStepsError.message };
  }
  const toStepIds = ((toStepsData ?? []) as { id: number }[]).map((s) => s.id);
  if (toStepIds.length > 0) {
    const { error: deleteError } = await supabase.from("follow_up_scheme_steps").delete().in("id", toStepIds);
    if (deleteError) {
      return { error: "コピー先の既存ステップ削除に失敗しました：" + deleteError.message };
    }
  }

  const idMap = new Map<number, number>();
  for (const step of fromSteps) {
    const { data: inserted, error: insertError } = await supabase
      .from("follow_up_scheme_steps")
      .insert({
        status: toStatus,
        days_after: step.days_after,
        months_after: step.months_after,
        label: step.label,
        use_phone: step.use_phone,
        use_email: step.use_email,
        sort_order: step.sort_order,
        active_until: step.active_until,
        fixed_date: step.fixed_date,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return { error: "ステップのコピーに失敗しました：" + (insertError?.message ?? "unknown error") };
    }
    idMap.set(step.id, inserted.id as number);
  }

  const { data: templatesData, error: templatesError } = await supabase
    .from("follow_up_templates")
    .select("*")
    .in("scheme_step_id", fromSteps.map((s) => s.id));
  if (templatesError) {
    return { error: "テンプレート取得に失敗しました：" + templatesError.message };
  }

  const templates = (templatesData ?? []) as FollowUpTemplate[];
  const templatesToInsert = templates
    .map((t) => {
      const newStepId = idMap.get(t.scheme_step_id);
      if (!newStepId) return null;
      return {
        store_id: t.store_id,
        scheme_step_id: newStepId,
        phone_script: t.phone_script,
        email_subject: t.email_subject,
        email_body: t.email_body,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  if (templatesToInsert.length > 0) {
    const { error: insertTemplatesError } = await supabase.from("follow_up_templates").insert(templatesToInsert);
    if (insertTemplatesError) {
      return { error: "テンプレートのコピーに失敗しました：" + insertTemplatesError.message };
    }
  }

  revalidateAll();
  return { success: true };
}
