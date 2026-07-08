import { createAdminClient } from "@/lib/supabase/admin";
import { sendFollowUpEmail } from "@/lib/mailer";
import { todayStrTokyo, nowTimeStrTokyo, addIntervalToDateStr } from "@/lib/date";
import {
  followUpBaseDate,
  isJoinedStatus,
  renderEmailBody,
  renderEmailSubject,
  type Customer,
  type FollowUpSchemeStep,
  type FollowUpTemplate,
  type FollowUpTaskCompletion,
  type StoreEmailAutomation,
  type StoreEmailSignature,
} from "@/lib/types";

type AdminClient = ReturnType<typeof createAdminClient>;
// upsert/insert先のテーブル操作だけができれば十分なので、admin/通常どちらのSupabaseクライアントも受け付ける
type QueryableClient = Pick<AdminClient, "from">;

// お客様1件・ステップ1件分のメール送信を実行し、完了状況・連絡履歴を記録する。
// 自動送信バッチ・手動送信ボタンの両方から呼ばれる共通処理。
export async function sendAndRecordFollowUpEmail(params: {
  supabase: QueryableClient;
  customer: Customer;
  step: FollowUpSchemeStep;
  template: FollowUpTemplate;
  signature: string | null;
  fromEmail: string;
  fromName: string;
  existingCompletion?: FollowUpTaskCompletion | null;
  logNote: string;
}): Promise<void> {
  const { supabase, customer, step, template, signature, fromEmail, fromName, existingCompletion, logNote } = params;

  if (!customer.email) {
    throw new Error("お客様のメールアドレスが登録されていません。");
  }
  if (!template.email_body) {
    throw new Error("メールテンプレートが未設定です。");
  }

  await sendFollowUpEmail({
    to: customer.email,
    from: { name: `【${fromName}】`, address: fromEmail },
    bcc: fromEmail,
    subject: renderEmailSubject(template.email_subject, customer.name),
    text: renderEmailBody(template.email_body, customer.name, signature),
  });

  const nowIso = new Date().toISOString();
  const { error: completionError } = await supabase.from("follow_up_task_completions").upsert(
    {
      customer_id: customer.id,
      scheme_step_id: step.id,
      email_sent_at: nowIso,
      completed: step.use_phone ? existingCompletion?.completed ?? false : true,
      completed_at: step.use_phone ? existingCompletion?.completed_at ?? null : nowIso,
    },
    { onConflict: "customer_id,scheme_step_id" }
  );
  if (completionError) throw completionError;

  const { error: logError } = await supabase.from("contact_logs").insert({
    customer_id: customer.id,
    contact_type: "EMAIL_SENT",
    note: logNote,
  });
  if (logError) throw logError;
}

export interface AutomationRunResult {
  store_id: number;
  sent: number;
  skipped: number;
  errors: string[];
}

// 有効化されている店舗のうち、設定時刻を過ぎていてまだ本日実行していないものを処理する。
// Vercel Cron から呼び出される想定（現在は日本時間20:00に1日1回）。
export async function runDueEmailAutomation(): Promise<AutomationRunResult[]> {
  const supabase = createAdminClient();
  const today = todayStrTokyo();
  const nowTime = nowTimeStrTokyo();

  const { data: automationsData, error: automationsError } = await supabase
    .from("store_email_automation")
    .select("*")
    .eq("enabled", true);
  if (automationsError) throw automationsError;
  const automations = (automationsData ?? []) as StoreEmailAutomation[];

  const results: AutomationRunResult[] = [];

  for (const automation of automations) {
    if (automation.last_run_date === today) continue;
    const sendTimeHHMM = automation.send_time.slice(0, 5);
    if (nowTime < sendTimeHHMM) continue;

    results.push(await runForStore(supabase, automation, today));
  }

  return results;
}

async function runForStore(
  supabase: AdminClient,
  automation: StoreEmailAutomation,
  today: string
): Promise<AutomationRunResult> {
  const result: AutomationRunResult = { store_id: automation.store_id, sent: 0, skipped: 0, errors: [] };

  if (!automation.from_email) {
    result.errors.push("送信元メールアドレス（from_email）が未設定のためスキップしました。");
    await markRun(supabase, automation.store_id, today);
    return result;
  }
  const fromEmail = automation.from_email;

  const { data: storeRow } = await supabase.from("stores").select("name").eq("id", automation.store_id).maybeSingle();
  const fromName = (storeRow as { name: string } | null)?.name ?? `店舗ID${automation.store_id}`;

  const { data: customersData } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", automation.store_id);
  const customers = ((customersData ?? []) as Customer[]).filter((c) => !isJoinedStatus(c.status));

  if (customers.length > 0) {
    const { data: stepsData } = await supabase.from("follow_up_scheme_steps").select("*").eq("use_email", true);
    const steps = (stepsData ?? []) as FollowUpSchemeStep[];

    const { data: templatesData } = await supabase
      .from("follow_up_templates")
      .select("*")
      .eq("store_id", automation.store_id);
    const templateMap = new Map(((templatesData ?? []) as FollowUpTemplate[]).map((t) => [t.scheme_step_id, t]));

    const { data: signatureRow } = await supabase
      .from("store_email_signatures")
      .select("*")
      .eq("store_id", automation.store_id)
      .maybeSingle();
    const signature = (signatureRow as StoreEmailSignature | null)?.signature ?? null;

    const { data: completionsData } = await supabase
      .from("follow_up_task_completions")
      .select("*")
      .in("customer_id", customers.map((c) => c.id));
    const completionMap = new Map(
      ((completionsData ?? []) as FollowUpTaskCompletion[]).map((c) => [`${c.customer_id}:${c.scheme_step_id}`, c])
    );

    for (const customer of customers) {
      if (!customer.email) continue;
      const base = followUpBaseDate(customer);

      for (const step of steps) {
        if (step.status !== customer.status) continue;

        const key = `${customer.id}:${step.id}`;
        const completion = completionMap.get(key);
        if (completion?.completed) continue;
        if (completion?.email_sent_at) continue; // 送信済み（二重送信防止）

        const dueDate = addIntervalToDateStr(base, step.days_after, step.months_after);
        if (dueDate > today) continue;

        const template = templateMap.get(step.id);
        if (!template?.email_body) {
          result.skipped++;
          continue;
        }

        try {
          await sendAndRecordFollowUpEmail({
            supabase,
            customer,
            step,
            template,
            signature,
            fromEmail,
            fromName,
            existingCompletion: completion,
            logNote: `自動送信（${step.label}）`,
          });
          result.sent++;
        } catch (err) {
          result.errors.push(
            `顧客ID ${customer.id} / ${step.label}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  await markRun(supabase, automation.store_id, today);
  return result;
}

async function markRun(supabase: AdminClient, storeId: number, today: string) {
  await supabase.from("store_email_automation").update({ last_run_date: today }).eq("store_id", storeId);
}
