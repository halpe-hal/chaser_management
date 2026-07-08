"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addCapacityOverride, deleteCapacityOverride } from "@/app/actions/scheduleSettings";
import type { StoreScheduleCapacityOverride } from "@/lib/types";

type FormState = { error?: string; success?: boolean } | null;

export function ScheduleCapacityOverrides({
  storeId,
  overrides,
}: {
  storeId: number;
  overrides: StoreScheduleCapacityOverride[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: number, label: string) {
    if (!window.confirm(`${label} の上書き設定を削除しますか？`)) return;
    startTransition(() => {
      deleteCapacityOverride(id);
    });
  }

  return (
    <div className="space-y-3">
      {overrides.length === 0 && <p className="text-sm text-gray-400">まだ期間別の上書き設定はありません。</p>}
      {overrides.map((o) => (
        <div key={o.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
          <p className="text-sm text-gray-700">
            {o.start_date} 〜 {o.end_date}：<span className="font-semibold">{o.capacity}名</span>
          </p>
          <button
            type="button"
            onClick={() => handleDelete(o.id, `${o.start_date}〜${o.end_date}`)}
            disabled={isPending}
            title="削除"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <CapacityOverrideAddForm storeId={storeId} />
    </div>
  );
}

function CapacityOverrideAddForm({ storeId }: { storeId: number }) {
  const boundAction = addCapacityOverride.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form key={resetKey} action={formAction} className="border border-dashed border-gray-300 rounded-xl p-3 space-y-3">
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">開始日</label>
          <input type="date" name="start_date" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">終了日</label>
          <input type="date" name="end_date" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">人数</label>
          <input type="number" name="capacity" min={1} required className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          + 追加
        </button>
      </div>
    </form>
  );
}
