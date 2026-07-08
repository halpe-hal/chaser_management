"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendFollowUpEmail } from "@/lib/mailer";
import type { Customer, CustomerStatus, StoreEmailAutomation, StoreEmailSignature } from "@/lib/types";

// SMTPプロバイダによってはBCCの同時宛先数に上限があるため、一定件数ごとに分けて送信する
const BCC_CHUNK_SIZE = 40;

export interface MassEmailPreview {
  error?: string;
  targetCount?: number;
  sampleNames?: string[];
}

export interface MassEmailResult {
  error?: string;
  sent?: number;
}

function hasEmail(customer: Customer): customer is Customer & { email: string } {
  return Boolean(customer.email);
}

async function loadTargets(storeId: number, statuses: CustomerStatus[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("*").eq("store_id", storeId).in("status", statuses);
  if (error) throw error;
  return ((data ?? []) as Customer[]).filter(hasEmail);
}

// 実際には送信せず、対象件数だけ確認できるようにする
export async function previewMassEmail(storeId: number, statuses: CustomerStatus[]): Promise<MassEmailPreview> {
  if (statuses.length === 0) return { error: "ステータスを選択してください。" };
  const targets = await loadTargets(storeId, statuses);
  return {
    targetCount: targets.length,
    sampleNames: targets.slice(0, 20).map((c) => c.name),
  };
}

export async function sendMassEmail(
  storeId: number,
  _prevState: unknown,
  formData: FormData
): Promise<MassEmailResult> {
  const statuses = formData.getAll("status").map((s) => String(s)) as CustomerStatus[];
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (statuses.length === 0 || !subject || !body) {
    return { error: "ステータス・件名・本文は必須です。" };
  }

  const supabase = await createClient();

  // 宛先（To）は店舗の送信元アドレス自身にし、実際の対象顧客はBCCに入れることで、
  // 顧客同士にメールアドレスが見えてしまわないようにする。
  const { data: automationRow } = await supabase
    .from("store_email_automation")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  const automation = automationRow as StoreEmailAutomation | null;
  if (!automation?.from_email) {
    return { error: "送信元メールアドレスが未設定です。ステップメール管理の「メール自動送信設定」で設定してください。" };
  }
  const fromEmail = automation.from_email;

  const { data: storeRow } = await supabase.from("stores").select("name").eq("id", storeId).maybeSingle();
  const fromName = (storeRow as { name: string } | null)?.name ?? `店舗ID${storeId}`;

  const { data: signatureRow } = await supabase
    .from("store_email_signatures")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  const signature = (signatureRow as StoreEmailSignature | null)?.signature ?? null;

  const targets = await loadTargets(storeId, statuses);
  if (targets.length === 0) {
    return { error: "対象の顧客（メールアドレス登録あり）がいません。" };
  }

  const fullBody = signature ? `${body}\n\n${signature}` : body;

  for (let i = 0; i < targets.length; i += BCC_CHUNK_SIZE) {
    const chunk = targets.slice(i, i + BCC_CHUNK_SIZE);
    await sendFollowUpEmail({
      to: fromEmail,
      from: { name: `【${fromName}】`, address: fromEmail },
      bcc: chunk.map((c) => c.email).join(","),
      subject,
      text: fullBody,
    });
  }

  const { error: logError } = await supabase.from("contact_logs").insert(
    targets.map((c) => ({
      customer_id: c.id,
      contact_type: "EMAIL_SENT" as const,
      note: `一斉メール送信：${subject}`,
    }))
  );

  revalidatePath("/customers");
  revalidatePath("/");

  if (logError) {
    return { error: `メールは送信しましたが、連絡履歴の記録に失敗しました：${logError.message}`, sent: targets.length };
  }

  return { sent: targets.length };
}
