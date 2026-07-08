import { createClient } from "@/lib/supabase/server";
import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { todayStrTokyo } from "@/lib/date";
import {
  FOLLOWUP_STATUSES,
  type CustomerStatus,
  type FollowUpGlobalSettings,
  type FollowUpSchemeStep,
  type FollowUpTemplate,
  type StepEmailPhase,
  type StoreEmailAutomation,
  type StoreEmailSignature,
} from "@/lib/types";
import { StepEmailStatusSelect } from "@/components/StepEmailStatusSelect";
import { StepEmailPhaseSelect } from "@/components/StepEmailPhaseSelect";
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
  searchParams: Promise<{ status?: string; phase?: string }>;
}) {
  const { status: statusParam, phase: phaseParam } = await searchParams;
  const status: CustomerStatus = FOLLOWUP_STATUSES.includes(statusParam as CustomerStatus)
    ? (statusParam as CustomerStatus)
    : FOLLOWUP_STATUSES[0];

  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";

  const supabase = await createClient();

  const { data: globalSettingsRow } = await supabase
    .from("follow_up_global_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const baseDateResetDate = (globalSettingsRow as FollowUpGlobalSettings | null)?.base_date_reset_date ?? null;

  // グランドオープン日が未設定、または既に過ぎていれば「グランドオープン以降」をデフォルト表示にする
  const defaultPhase: StepEmailPhase =
    baseDateResetDate && baseDateResetDate >= todayStrTokyo() ? "pre" : "post";
  const phase: StepEmailPhase = phaseParam === "pre" || phaseParam === "post" ? phaseParam : defaultPhase;
  // プレオープン期間の画面で追加・編集するステップには、自動でグランドオープン日を有効期限として設定する
  const activeUntilForPhase = phase === "pre" ? baseDateResetDate : null;

  const { data: stepsData } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .eq("status", status)
    .order("sort_order", { ascending: true });
  const allSteps = (stepsData ?? []) as FollowUpSchemeStep[];
  const steps = allSteps.filter((s) => (phase === "pre" ? s.active_until !== null : s.active_until === null));

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
          「プレオープン期間」で登録したステップは、グランドオープン日を過ぎると自動的に使われなくなり、「グランドオープン以降」のステップに切り替わります。
          「固定日」を設定すると、経過日数ではなくその日付そのものに送信予定となります（例：プレオープン期間中に全員へ固定日でメールを送るステップ）。
        </p>
      </div>

      <BaseDateResetForm baseDateResetDate={baseDateResetDate} />

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">ステータス</label>
          <StepEmailStatusSelect value={status} options={FOLLOWUP_STATUSES} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">期間</label>
          <StepEmailPhaseSelect value={phase} />
        </div>
      </div>

      {storeId !== null && <EmailAutomationSettings storeId={storeId} automation={automation} />}

      {storeId !== null && <EmailSignatureEditor storeId={storeId} signature={signature} />}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          {status}（{phase === "pre" ? "プレオープン期間" : "グランドオープン以降"}）
        </h2>
        {phase === "pre" && !baseDateResetDate && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            グランドオープン日が未設定です。上の「グランドオープン日」を先に設定してください（未設定のままだと、ここで追加したステップが「プレオープン期間」として区別されません）。
          </p>
        )}
        {steps.length === 0 && <p className="text-sm text-gray-400">ステップが登録されていません。</p>}
        {steps.map((step) => (
          <StepEmailCard
            key={step.id}
            step={step}
            activeUntil={activeUntilForPhase}
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
          <SchemeStepAddForm status={status} activeUntil={activeUntilForPhase} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">スキームをコピー</h2>
        <p className="text-xs text-gray-500 mb-3">
          「{status}」の内容（ステップ・電話トーク・メール本文、プレオープン期間・グランドオープン以降とも全て）を、他のステータスにコピーします。コピー先の既存の内容は削除されて上書きされます。
        </p>
        <SchemeCopyForm fromStatus={status} otherStatuses={FOLLOWUP_STATUSES.filter((s) => s !== status)} />
      </div>
    </div>
  );
}
