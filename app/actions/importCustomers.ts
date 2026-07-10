"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildCsvImportPlan, parseReservationCsv, type CsvPlanRow, type ExistingCustomerRow } from "@/lib/csvImport";
import { getCapacityOverrides, getDefaultScheduleCapacity, resolveCapacityForDate } from "@/lib/schedule";

export interface ImportResult {
  error?: string;
  imported?: number;
  skippedDuplicate?: number;
  skippedNoDate?: number;
  unassignedSlot?: number;
  rebooked?: number;
  total?: number;
  warnings?: string[];
}

export interface CsvPreviewResult {
  error?: string;
  plan?: CsvPlanRow[];
  warnings?: string[];
}

async function parseAndBuildPlan(
  storeId: number,
  formData: FormData
): Promise<{ error: string } | { plan: CsvPlanRow[]; warnings: string[] }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "CSVファイルを選択してください。" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, warnings } = parseReservationCsv(buffer);

  if (rows.length === 0) {
    return { error: "取り込めるデータが見つかりませんでした。" };
  }

  const supabase = await createClient();

  const [{ data: existingData }, defaultCapacity, capacityOverrides] = await Promise.all([
    supabase
      .from("customers")
      .select("id, email, phone, reservation_date, reservation_time, slot_number, status, created_at")
      .eq("store_id", storeId),
    getDefaultScheduleCapacity(storeId, supabase),
    getCapacityOverrides(storeId, supabase),
  ]);
  const existingRows = (existingData ?? []) as ExistingCustomerRow[];

  const plan = buildCsvImportPlan(rows, existingRows, (date) =>
    resolveCapacityForDate(date, capacityOverrides, defaultCapacity)
  );

  return { plan, warnings };
}

// 実際に取り込む前に、パース結果と登録・スキップ・再予約の判定を確認できるようにする（DBへの書き込みはしない）
export async function previewImportCsv(storeId: number, formData: FormData): Promise<CsvPreviewResult> {
  const result = await parseAndBuildPlan(storeId, formData);
  if ("error" in result) return { error: result.error };
  return { plan: result.plan, warnings: result.warnings };
}

export async function importCustomersCsv(
  storeId: number,
  _prevState: unknown,
  formData: FormData
): Promise<ImportResult> {
  const result = await parseAndBuildPlan(storeId, formData);
  if ("error" in result) return { error: result.error };
  const { plan, warnings } = result;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const toInsert = plan
    .filter((p) => p.outcome === "import")
    .map((p) => ({
      store_id: storeId,
      name: p.name,
      email: p.email,
      phone: p.phone,
      reservation_date: p.reservationDate!,
      reservation_time: p.reservationTime,
      reservation_end_time: p.reservationTime ? p.reservationEndTime : null,
      slot_number: p.slotNumber,
      status: "未来店" as const,
      created_by: user?.id ?? null,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("customers").insert(toInsert);
    if (error) {
      return { error: "登録に失敗しました：" + error.message, warnings };
    }
  }

  // 一致する既存顧客が見つかった行は、新規登録せずにその顧客を新しい予約情報へ移動させ、
  // ステータスを「再予約済」にする（重複レコードを作らないため）
  const rebookRows = plan.filter((p) => p.outcome === "rebook");
  for (const p of rebookRows) {
    await supabase
      .from("customers")
      .update({
        name: p.name,
        email: p.email,
        phone: p.phone,
        reservation_date: p.reservationDate!,
        reservation_time: p.reservationTime,
        reservation_end_time: p.reservationTime ? p.reservationEndTime : null,
        slot_number: p.slotNumber,
        status: "再予約済",
        pre_cancel_date: null,
        ever_rebooked_at: new Date().toISOString(),
      })
      .eq("id", p.rebookTargetId!);
  }

  // 同じ連絡先で複数の既存顧客がマッチしてしまった場合、移動対象以外は再予約済にするだけにとどめる
  const extraRebookIds = Array.from(new Set(plan.flatMap((p) => p.extraRebookIds)));
  if (extraRebookIds.length > 0) {
    await supabase
      .from("customers")
      .update({ status: "再予約済", ever_rebooked_at: new Date().toISOString() })
      .in("id", extraRebookIds);
  }

  revalidatePath("/customers");
  revalidatePath("/schedule");
  revalidatePath("/");

  return {
    imported: toInsert.length,
    skippedDuplicate: plan.filter((p) => p.outcome === "duplicate").length,
    skippedNoDate: plan.filter((p) => p.outcome === "no_date").length,
    unassignedSlot: plan.filter((p) => p.outcome !== "duplicate" && p.outcome !== "no_date" && p.slotFull).length,
    rebooked: rebookRows.length + extraRebookIds.length,
    total: plan.length,
    warnings,
  };
}
