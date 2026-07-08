"use client";

import { useActionState } from "react";
import { updateScheduleCapacity } from "@/app/actions/scheduleSettings";

type FormState = { error?: string; success?: boolean } | null;

export function ScheduleCapacityForm({ storeId, capacity }: { storeId: number; capacity: number }) {
  const boundAction = updateScheduleCapacity.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">同時受け入れ人数（列数）</label>
        <input
          type="number"
          name="capacity"
          min={1}
          required
          defaultValue={capacity}
          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        保存
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-700">保存しました。</p>}
    </form>
  );
}
