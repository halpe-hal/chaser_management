"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAndRecordFollowUpEmail } from "@/lib/emailAutomation";
import type {
  Customer,
  FollowUpSchemeStep,
  FollowUpTaskCompletion,
  FollowUpTemplate,
  StoreEmailAutomation,
  StoreEmailSignature,
} from "@/lib/types";

export async function sendFollowUpEmailNow(
  customerId: number,
  stepId: number
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const { data: customerData } = await supabase.from("customers").select("*").eq("id", customerId).maybeSingle();
  const customer = customerData as Customer | null;
  if (!customer) return { error: "顧客が見つかりません。" };
  if (!customer.email) return { error: "お客様のメールアドレスが登録されていません。" };

  const { data: stepData } = await supabase.from("follow_up_scheme_steps").select("*").eq("id", stepId).maybeSingle();
  const step = stepData as FollowUpSchemeStep | null;
  if (!step) return { error: "スキームステップが見つかりません。" };
  if (!step.use_email) return { error: "このステップはメール送信の対象ではありません。" };

  const { data: automationData } = await supabase
    .from("store_email_automation")
    .select("*")
    .eq("store_id", customer.store_id)
    .maybeSingle();
  const fromEmail = (automationData as StoreEmailAutomation | null)?.from_email;
  if (!fromEmail) {
    return { error: "送信元メールアドレスが未設定です。テンプレート管理の「メール自動送信設定」で設定してください。" };
  }

  const { data: templateData } = await supabase
    .from("follow_up_templates")
    .select("*")
    .eq("store_id", customer.store_id)
    .eq("scheme_step_id", stepId)
    .maybeSingle();
  const template = templateData as FollowUpTemplate | null;
  if (!template?.email_body) {
    return { error: "メールテンプレートが未設定です。テンプレート管理で登録してください。" };
  }

  const { data: signatureRow } = await supabase
    .from("store_email_signatures")
    .select("*")
    .eq("store_id", customer.store_id)
    .maybeSingle();
  const signature = (signatureRow as StoreEmailSignature | null)?.signature ?? null;

  const { data: existingCompletionData } = await supabase
    .from("follow_up_task_completions")
    .select("*")
    .eq("customer_id", customerId)
    .eq("scheme_step_id", stepId)
    .maybeSingle();
  const existingCompletion = existingCompletionData as FollowUpTaskCompletion | null;

  try {
    await sendAndRecordFollowUpEmail({
      supabase,
      customer,
      step,
      template,
      signature,
      fromEmail,
      existingCompletion,
      logNote: `手動送信（${step.label}）`,
    });
  } catch (err) {
    return { error: "送信に失敗しました：" + (err instanceof Error ? err.message : String(err)) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
  return { success: true };
}
