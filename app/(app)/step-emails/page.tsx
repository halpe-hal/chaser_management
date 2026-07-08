import { createClient } from "@/lib/supabase/server";
import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import {
  FOLLOWUP_STATUSES,
  type CustomerStatus,
  type FollowUpGlobalSettings,
  type FollowUpSchemeStep,
  type FollowUpTemplate,
  type StoreEmailAutomation,
  type StoreEmailSignature,
} from "@/lib/types";
import { StepEmailStatusSelect } from "@/components/StepEmailStatusSelect";
import { StepEmailCard } from "@/components/StepEmailCard";
import { SchemeStepAddForm } from "@/components/SchemeStepAddForm";
import { SchemeCopyForm } from "@/components/SchemeCopyForm";
import { EmailSignatureEditor } from "@/components/EmailSignatureEditor";
import { EmailAutomationSettings } from "@/components/EmailAutomationSettings";
import { BaseDateResetForm } from "@/components/BaseDateResetForm";

// ステータス切り替え直後に古い内容が表示され続けることがないよう、キャッシュを使わせない
export const dynamic = "force-dynamic";

export default async function StepEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status: CustomerStatus = FOLLOWUP_STATUSES.includes(statusParam as CustomerStatus)
    ? (statusParam as CustomerStatus)
    : FOLLOWUP_STATUSES[0];

  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";

  const supabase = await createClient();

  const { data: stepsData } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .eq("status", status)
    .order("sort_order", { ascending: true });
  const steps = (stepsData ?? []) as FollowUpSchemeStep[];

  const { data: globalSettingsRow } = await supabase
    .from("follow_up_global_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const baseDateResetDate = (globalSettingsRow as FollowUpGlobalSettings | null)?.base_date_reset_date ?? null;

  const byStep: Record<number, FollowUpTemplate> = {};
  let signature: string | null = null;
  let automation: StoreEmailAutomation | null = null;
  if (storeId !== null) {
    const { data } = await supabase.from("follow_up_templates").select("*").eq("store_id", storeId);
    for (const row of (data ?? []) as FollowUpTemplate[]) {
      byStep[row.scheme_step_id] = row;
    }

    const { data: signatureRow } = await supabase
      .from("store_email_signatures")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    signature = (signatureRow as StoreEmailSignature | null)?.signature ?? null;

    const { data: automationRow } = await supabase
      .from("store_email_automation")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    automation = automationRow as StoreEmailAutomation | null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ステップメール管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          {storeName ? `${storeName} の` : ""}ステータスごとに、追客のステップ（経過日数・連絡方法）と、その電話トークマニュアル・メールテンプレートをまとめて編集します（ヘッダーの店舗セレクターで対象店舗を切り替えられます）。
          ステップの構成（経過日数・ラベルなど）はすべての店舗で共通、電話トーク・メールの中身は店舗ごとに個別です。
          「有効期限」を設定すると、その日までの期間限定スキームになります（例：プレオープン期間中の特別対応）。期限内は通常（期限なし）のステップより優先され、期限が過ぎると自動的に通常のステップに戻ります。
          「固定日」を設定すると、経過日数ではなくその日付そのものに送信予定となります（例：プレオープン期間中に全員へ固定日でメールを送るステップ）。
        </p>
      </div>

      <BaseDateResetForm baseDateResetDate={baseDateResetDate} />

      <div>
        <label className="block text-xs text-gray-500 mb-1">ステータス</label>
        <StepEmailStatusSelect value={status} options={FOLLOWUP_STATUSES} />
      </div>

      {storeId !== null && <EmailAutomationSettings storeId={storeId} automation={automation} />}

      {storeId !== null && <EmailSignatureEditor storeId={storeId} signature={signature} />}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{status}</h2>
        {steps.length === 0 && <p className="text-sm text-gray-400">ステップが登録されていません。</p>}
        {steps.map((step) => (
          <StepEmailCard
            key={step.id}
            step={step}
            template={
              storeId !== null
                ? byStep[step.id] ?? {
                    store_id: storeId,
                    scheme_step_id: step.id,
                    phone_script: null,
                    email_subject: null,
                    email_body: null,
                    updated_at: "",
                  }
                : null
            }
          />
        ))}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <SchemeStepAddForm status={status} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">スキームをコピー</h2>
        <p className="text-xs text-gray-500 mb-3">
          「{status}」の内容（ステップ・電話トーク・メール本文）を、他のステータスにコピーします。コピー先の既存の内容は削除されて上書きされます。
        </p>
        <SchemeCopyForm fromStatus={status} otherStatuses={FOLLOWUP_STATUSES.filter((s) => s !== status)} />
      </div>
    </div>
  );
}
