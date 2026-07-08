import { createClient } from "@/lib/supabase/server";
import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import {
  CUSTOMER_STATUSES,
  type CustomerStatus,
  type FollowUpSchemeStep,
  type FollowUpTemplate,
  type StoreEmailAutomation,
  type StoreEmailSignature,
} from "@/lib/types";
import { TemplateEditor } from "@/components/TemplateEditor";
import { StatusFilterSelect } from "@/components/StatusFilterSelect";
import { EmailSignatureEditor } from "@/components/EmailSignatureEditor";
import { EmailAutomationSettings } from "@/components/EmailAutomationSettings";

// ステータス切り替え直後に古い内容が表示され続けることがないよう、キャッシュを使わせない
export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status: CustomerStatus = CUSTOMER_STATUSES.includes(statusParam as CustomerStatus)
    ? (statusParam as CustomerStatus)
    : CUSTOMER_STATUSES[0];

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
        <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          {storeName ? `${storeName} の` : ""}ステータス・経過日数ごとの電話トークマニュアル・メールテンプレートを編集します（ヘッダーの店舗セレクターで対象店舗を切り替えられます。ステップ自体の追加・編集は「スキーム設定」で行います）。
        </p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">ステータス</label>
        <StatusFilterSelect value={status} />
      </div>

      {storeId !== null && <EmailAutomationSettings storeId={storeId} automation={automation} />}

      {storeId !== null && <EmailSignatureEditor storeId={storeId} signature={signature} />}

      {storeId === null ? (
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      ) : steps.length === 0 ? (
        <p className="text-sm text-gray-500">このステータスにはステップが登録されていません（「スキーム設定」で追加してください）。</p>
      ) : (
        <div className="space-y-4">
          {steps.map((step) => (
            <TemplateEditor
              key={step.id}
              step={step}
              template={
                byStep[step.id] ?? {
                  store_id: storeId,
                  scheme_step_id: step.id,
                  phone_script: null,
                  email_subject: null,
                  email_body: null,
                  updated_at: "",
                }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
