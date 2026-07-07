import { createClient } from "@/lib/supabase/server";
import { getValidatedStoreId } from "@/lib/stores";
import { getDueFollowUpTasks, getStatusCounts } from "@/lib/customers";
import { StatusCountCards } from "@/components/StatusCountCards";
import { FollowUpAlertList } from "@/components/FollowUpAlertList";
import type { FollowUpTemplate, StoreEmailSignature } from "@/lib/types";

export default async function DashboardPage() {
  const storeId = await getValidatedStoreId();
  const supabase = await createClient();

  const templatesQuery =
    storeId !== null
      ? supabase.from("follow_up_templates").select("*").eq("store_id", storeId)
      : Promise.resolve({ data: [] as FollowUpTemplate[] });

  const signatureQuery =
    storeId !== null
      ? supabase.from("store_email_signatures").select("*").eq("store_id", storeId).maybeSingle()
      : Promise.resolve({ data: null as StoreEmailSignature | null });

  const [tasks, counts, { data: templateRows }, { data: signatureRow }] = await Promise.all([
    getDueFollowUpTasks(storeId),
    getStatusCounts(storeId),
    templatesQuery,
    signatureQuery,
  ]);

  const templates: Record<number, FollowUpTemplate> = {};
  for (const row of (templateRows ?? []) as FollowUpTemplate[]) {
    templates[row.scheme_step_id] = row;
  }
  const signature = (signatureRow as StoreEmailSignature | null)?.signature ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      <StatusCountCards counts={counts} />

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">追客アラート</h2>
        <p className="text-sm text-gray-500 mb-4">本日までに対応が必要な見学者一覧（期日の近い順）</p>
        <FollowUpAlertList tasks={tasks} templates={templates} signature={signature} />
      </div>
    </div>
  );
}
