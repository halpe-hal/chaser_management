import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_STATUSES, type FollowUpSchemeStep } from "@/lib/types";
import { SchemeStepRow } from "@/components/SchemeStepRow";
import { SchemeStepAddForm } from "@/components/SchemeStepAddForm";

export default async function SchemesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follow_up_scheme_steps")
    .select("*")
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });
  const steps = (data ?? []) as FollowUpSchemeStep[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スキーム設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          ステータスごとに、経過日数・連絡方法（電話／メール）を自由に登録・編集・削除できます。ここでの変更はすべての店舗のダッシュボード・顧客詳細にすぐ反映されます。
        </p>
      </div>

      {CUSTOMER_STATUSES.map((status) => {
        const statusSteps = steps.filter((s) => s.status === status);
        return (
          <div key={status} className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{status}</h2>
            {statusSteps.length === 0 && <p className="text-sm text-gray-400">ステップが登録されていません。</p>}
            {statusSteps.map((step) => (
              <SchemeStepRow key={step.id} step={step} />
            ))}
            <SchemeStepAddForm status={status} />
          </div>
        );
      })}
    </div>
  );
}
