"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus } from "@/lib/types";

function readCustomerFields(formData: FormData) {
  const status = String(formData.get("status") ?? "未来店") as CustomerStatus;
  const preCancelDate = String(formData.get("pre_cancel_date") ?? "") || null;

  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    reservation_date: String(formData.get("reservation_date") ?? ""),
    status,
    pre_cancel_date: status === "事前キャンセル" ? preCancelDate : null,
  };
}

export async function createCustomer(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const storeId = Number(formData.get("store_id"));
  const fields = readCustomerFields(formData);

  if (!storeId || !fields.name || !fields.reservation_date) {
    return { error: "店舗・お客様名・ご予約日は必須です。" };
  }
  if (fields.status === "事前キャンセル" && !fields.pre_cancel_date) {
    return { error: "事前キャンセルの場合は事前キャンセル日が必須です。" };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      store_id: storeId,
      ...fields,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(customerId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const fields = readCustomerFields(formData);

  if (!fields.name || !fields.reservation_date) {
    return { error: "お客様名・ご予約日は必須です。" };
  }
  if (fields.status === "事前キャンセル" && !fields.pre_cancel_date) {
    return { error: "事前キャンセルの場合は事前キャンセル日が必須です。" };
  }

  const { error } = await supabase.from("customers").update(fields).eq("id", customerId);

  if (error) {
    return { error: "更新に失敗しました：" + error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCustomer(customerId: number): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", customerId);

  if (error) {
    return { error: "削除に失敗しました：" + error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/");
  redirect("/customers");
}

