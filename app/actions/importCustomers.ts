"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseReservationCsv } from "@/lib/csvImport";

export interface ImportResult {
  error?: string;
  imported?: number;
  skippedDuplicate?: number;
  skippedNoDate?: number;
  total?: number;
  warnings?: string[];
}

export async function importCustomersCsv(
  storeId: number,
  _prevState: unknown,
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "CSVファイルを選択してください。" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, warnings } = parseReservationCsv(buffer);

  if (rows.length === 0) {
    return { error: "取り込めるデータが見つかりませんでした。", warnings };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existingData } = await supabase
    .from("customers")
    .select("email, phone, reservation_date")
    .eq("store_id", storeId);
  const existingKeys = new Set(
    ((existingData ?? []) as { email: string | null; phone: string | null; reservation_date: string }[]).map(
      (c) => `${c.email ?? ""}:${c.phone ?? ""}:${c.reservation_date}`
    )
  );

  let skippedNoDate = 0;
  let skippedDuplicate = 0;
  const toInsert: {
    store_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    reservation_date: string;
    status: "未来店";
    created_by: string | null;
  }[] = [];

  for (const row of rows) {
    if (!row.reservationDate) {
      skippedNoDate++;
      continue;
    }
    const key = `${row.email ?? ""}:${row.phone ?? ""}:${row.reservationDate}`;
    if (existingKeys.has(key)) {
      skippedDuplicate++;
      continue;
    }
    existingKeys.add(key);
    toInsert.push({
      store_id: storeId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      reservation_date: row.reservationDate,
      status: "未来店",
      created_by: user?.id ?? null,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("customers").insert(toInsert);
    if (error) {
      return { error: "登録に失敗しました：" + error.message, warnings };
    }
  }

  revalidatePath("/customers");
  revalidatePath("/");

  return {
    imported: toInsert.length,
    skippedDuplicate,
    skippedNoDate,
    total: rows.length,
    warnings,
  };
}
