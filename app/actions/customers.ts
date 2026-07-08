"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignSlotNumber, getScheduleCapacityForDate } from "@/lib/schedule";
import type { CustomerStatus } from "@/lib/types";

function readCustomerFields(formData: FormData) {
  const status = String(formData.get("status") ?? "未来店") as CustomerStatus;
  const preCancelDate = String(formData.get("pre_cancel_date") ?? "") || null;
  const staffMemberIdRaw = String(formData.get("staff_member_id") ?? "");
  const reservationTime = String(formData.get("reservation_time") ?? "") || null;
  const reservationEndTime = String(formData.get("reservation_end_time") ?? "") || null;

  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    reservation_date: String(formData.get("reservation_date") ?? ""),
    reservation_time: reservationTime,
    reservation_end_time: reservationTime ? reservationEndTime : null,
    status,
    pre_cancel_date: status === "事前キャンセル" ? preCancelDate : null,
    staff_member_id: staffMemberIdRaw ? Number(staffMemberIdRaw) : null,
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

  let slotNumber: number | null = null;
  if (fields.reservation_time) {
    const capacity = await getScheduleCapacityForDate(storeId, fields.reservation_date, supabase);
    slotNumber = await assignSlotNumber(supabase, storeId, fields.reservation_date, fields.reservation_time, capacity);
    if (slotNumber === null) {
      return { error: "この時間帯は満席です。別の時間を選んでください。" };
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      store_id: storeId,
      ...fields,
      slot_number: slotNumber,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/schedule");
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

  const { data: current } = await supabase
    .from("customers")
    .select("store_id, reservation_date, reservation_time, slot_number, paired_customer_id")
    .eq("id", customerId)
    .single();

  let slotNumber: number | null = current?.slot_number ?? null;
  const dateOrTimeChanged =
    !current || current.reservation_date !== fields.reservation_date || current.reservation_time !== fields.reservation_time;

  // 同伴者（他の顧客に紐付いている）は自分の枠を消費しない。主予約者と同じセルに表示されるだけなので、
  // 予約枠（slot_number）は常に持たせない。
  if (current?.paired_customer_id) {
    slotNumber = null;
  } else if (fields.reservation_time && dateOrTimeChanged && current) {
    const capacity = await getScheduleCapacityForDate(current.store_id, fields.reservation_date, supabase);
    slotNumber = await assignSlotNumber(
      supabase,
      current.store_id,
      fields.reservation_date,
      fields.reservation_time,
      capacity,
      customerId
    );
    if (slotNumber === null) {
      return { error: "この時間帯は満席です。別の時間を選んでください。" };
    }
  } else if (!fields.reservation_time) {
    slotNumber = null;
  }

  const { error } = await supabase
    .from("customers")
    .update({ ...fields, slot_number: slotNumber })
    .eq("id", customerId);

  if (error) {
    return { error: "更新に失敗しました：" + error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { success: true };
}

// ペアでご来店の同伴者を、主予約者と同じ日時を引き継いだ別の顧客レコードとして作成する。
// 名前・メール・電話・ステータスはこのあと本人の編集画面で入力してもらう。
export async function createCompanion(primaryCustomerId: number): Promise<{ error?: string } | void> {
  const supabase = await createClient();

  const { data: primary, error: primaryError } = await supabase
    .from("customers")
    .select("store_id, reservation_date, reservation_time, reservation_end_time, staff_member_id")
    .eq("id", primaryCustomerId)
    .single();

  if (primaryError || !primary) {
    return { error: "登録元の予約が見つかりませんでした。" };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      store_id: primary.store_id,
      name: "未設定（同伴者）",
      reservation_date: primary.reservation_date,
      reservation_time: primary.reservation_time,
      reservation_end_time: primary.reservation_end_time,
      staff_member_id: primary.staff_member_id,
      status: "未来店",
      paired_customer_id: primaryCustomerId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidatePath(`/customers/${primaryCustomerId}`);
  revalidatePath("/customers");
  revalidatePath("/schedule");
  redirect(`/customers/${data.id}`);
}

export async function deleteCustomer(customerId: number): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", customerId);

  if (error) {
    return { error: "削除に失敗しました：" + error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect("/customers");
}
