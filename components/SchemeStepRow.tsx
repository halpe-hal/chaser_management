"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { FollowUpSchemeStep } from "@/lib/types";
import { updateSchemeStep, deleteSchemeStep } from "@/app/actions/followUpSchemes";

type FormState = { error?: string; success?: boolean } | null;

export function SchemeStepRow({ step }: { step: FollowUpSchemeStep }) {
  const boundAction = updateSchemeStep.bind(null, step.id) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  function handleDelete() {
    if (!window.confirm(`「${step.label}」を削除しますか？このステップに紐づくテンプレートも削除されます。`)) return;
    deleteSchemeStep(step.id);
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border border-gray-100 rounded-xl p-3">
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <div>
        <label className="block text-xs text-gray-500 mb-1">ラベル</label>
        <input
          type="text"
          name="label"
          required
          defaultValue={step.label}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">経過日数</label>
        <input
          type="number"
          name="days_after"
          min={0}
          required
          defaultValue={step.days_after}
          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
        <input type="checkbox" name="use_phone" defaultChecked={step.use_phone} className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
        電話
      </label>
      <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
        <input type="checkbox" name="use_email" defaultChecked={step.use_email} className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
        メール
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        保存
      </button>
      <button
        type="button"
        onClick={handleDelete}
        title="削除"
        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}
