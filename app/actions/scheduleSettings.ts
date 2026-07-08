"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateAll() {
  revalidatePath("/schedule-settings");
  revalidatePath("/schedule");
}

export async function addTimeSlot(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const time = String(formData.get("time") ?? "");
  const days = formData.getAll("days").map((d) => Number(d));

  if (!time) {
    return { error: "時間は必須です。" };
  }
  if (days.length === 0) {
    return { error: "曜日を1つ以上選択してください。" };
  }

  const { error } = await supabase.from("store_time_slots").insert(
    days.map((day_of_week) => ({
      store_id: storeId,
      day_of_week,
      time,
      sort_order: Number(time.replace(":", "")),
    }))
  );

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

// 例: 開始10:00・終了17:00・1時間区切り → 10:00,11:00,...,16:00（終了時刻ちょうどは含めない）
function generateHourlyTimes(startTime: string, endTime: string): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const times: string[] = [];
  for (let m = startMinutes; m < endMinutes; m += 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return times;
}

export async function addTimeSlotRange(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const days = formData.getAll("days").map((d) => Number(d));

  if (!startTime || !endTime) {
    return { error: "開始・終了時間は必須です。" };
  }
  if (startTime >= endTime) {
    return { error: "終了時間は開始時間より後にしてください。" };
  }
  if (days.length === 0) {
    return { error: "曜日を1つ以上選択してください。" };
  }

  const times = generateHourlyTimes(startTime, endTime);
  const rows = days.flatMap((day_of_week) =>
    times.map((time) => ({
      store_id: storeId,
      day_of_week,
      time,
      sort_order: Number(time.replace(":", "")),
    }))
  );

  const { error } = await supabase
    .from("store_time_slots")
    .upsert(rows, { onConflict: "store_id,day_of_week,time" });

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function setTimeSlotDay(storeId: number, time: string, dayOfWeek: number, enabled: boolean) {
  const supabase = await createClient();

  if (enabled) {
    await supabase.from("store_time_slots").upsert(
      { store_id: storeId, day_of_week: dayOfWeek, time, sort_order: Number(time.replace(":", "")) },
      { onConflict: "store_id,day_of_week,time" }
    );
  } else {
    await supabase
      .from("store_time_slots")
      .delete()
      .eq("store_id", storeId)
      .eq("day_of_week", dayOfWeek)
      .eq("time", time);
  }

  revalidateAll();
}

export async function deleteTimeSlot(storeId: number, time: string) {
  const supabase = await createClient();
  await supabase.from("store_time_slots").delete().eq("store_id", storeId).eq("time", time);
  revalidateAll();
}

export async function updateScheduleCapacity(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const capacity = Number(formData.get("capacity"));
  if (!Number.isFinite(capacity) || capacity < 1) {
    return { error: "人数は1以上の数値を入力してください。" };
  }

  const { error } = await supabase
    .from("store_schedule_settings")
    .upsert({ store_id: storeId, capacity }, { onConflict: "store_id" });

  if (error) {
    return { error: "保存に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function addCapacityOverride(storeId: number, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const capacity = Number(formData.get("capacity"));

  if (!startDate || !endDate) {
    return { error: "開始日・終了日は必須です。" };
  }
  if (startDate > endDate) {
    return { error: "終了日は開始日以降にしてください。" };
  }
  if (!Number.isFinite(capacity) || capacity < 1) {
    return { error: "人数は1以上の数値を入力してください。" };
  }

  const { error } = await supabase.from("store_schedule_capacity_overrides").insert({
    store_id: storeId,
    start_date: startDate,
    end_date: endDate,
    capacity,
  });

  if (error) {
    return { error: "登録に失敗しました：" + error.message };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteCapacityOverride(id: number) {
  const supabase = await createClient();
  await supabase.from("store_schedule_capacity_overrides").delete().eq("id", id);
  revalidateAll();
}
