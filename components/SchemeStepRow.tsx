"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { FollowUpSchemeStep } from "@/lib/types";
import { updateSchemeStep, deleteSchemeStep } from "@/app/actions/followUpSchemes";
import { todayStrTokyo } from "@/lib/date";

type FormState = { error?: string; success?: boolean } | null;

export function SchemeStepRow({ step, activeUntil }: { step: FollowUpSchemeStep; activeUntil: string | null }) {
  const boundAction = updateSchemeStep.bind(null, step.id) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  function handleDelete() {
    if (!window.confirm(`「${step.label}」を削除しますか？このステップに紐づくテンプレートも削除されます。`)) return;
    deleteSchemeStep(step.id);
  }

  const isExpired = Boolean(step.active_until) && step.active_until! < todayStrTokyo();

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <input type="hidden" name="active_until" value={activeUntil ?? ""} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {(step.active_until || step.fixed_date) && (
        <div className="flex flex-wrap gap-2">
          {step.active_until && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                isExpired ? "bg-gray-100 text-gray-500 border-gray-300" : "bg-brand/10 text-brand-dark border-brand/30"
              }`}
            >
              {isExpired ? `期限切れ（〜${step.active_until}）` : `プレオープン期間限定（〜${step.active_until}）`}
            </span>
          )}
          {step.fixed_date && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-brand/10 text-brand-dark border-brand/30">
              固定日：{step.fixed_date} に送信
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">ラベル</label>
          <input
            type="text"
            name="label"
            required
            defaultValue={step.label}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">経過</label>
          <input
            type="number"
            name="value"
            min={0}
            defaultValue={step.months_after > 0 ? step.months_after : step.days_after}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">単位</label>
          <select
            name="unit"
            defaultValue={step.months_after > 0 ? "month" : "day"}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="day">日後</option>
            <option value="month">ヶ月後（同じ日）</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">固定日（任意・指定時は経過日数より優先）</label>
          <input
            type="date"
            name="fixed_date"
            defaultValue={step.fixed_date ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
      </div>
    </form>
  );
}
