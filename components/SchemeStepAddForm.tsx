"use client";

import { useActionState, useEffect, useState } from "react";
import type { CustomerStatus } from "@/lib/types";
import { createSchemeStep } from "@/app/actions/followUpSchemes";

export function SchemeStepAddForm({ status }: { status: CustomerStatus }) {
  const [state, formAction, isPending] = useActionState(createSchemeStep, null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form key={resetKey} action={formAction} className="flex flex-wrap items-end gap-3 border border-dashed border-gray-300 rounded-xl p-3">
      <input type="hidden" name="status" value={status} />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <div>
        <label className="block text-xs text-gray-500 mb-1">ラベル</label>
        <input type="text" name="label" required placeholder="例：2ヶ月後" className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">経過日数</label>
        <input type="number" name="days_after" min={0} required placeholder="60" className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
        <input type="checkbox" name="use_phone" className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
        電話
      </label>
      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
        <input type="checkbox" name="use_email" defaultChecked className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
        メール
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        + 追加
      </button>
    </form>
  );
}
