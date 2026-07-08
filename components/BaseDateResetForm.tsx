"use client";

import { useActionState } from "react";
import { updateBaseDateResetDate } from "@/app/actions/followUpGlobalSettings";

export function BaseDateResetForm({ baseDateResetDate }: { baseDateResetDate: string | null }) {
  const [state, formAction, isPending] = useActionState(updateBaseDateResetDate, null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">起算日リセット日</h2>
      <p className="text-sm text-gray-500 mb-4">
        設定した日を過ぎると、ご予約日がその日より前の顧客は、追客ステップの起算日がこの日に切り替わります（例：プレオープン期間中に登録した顧客の起算日を、実際のオープン日に統一する）。ご予約日がこの日以降の顧客には影響しません。空欄にすると無効になります（全店舗共通の設定です）。
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="w-full text-sm text-emerald-700">保存しました。</p>}
        <div>
          <label className="block text-xs text-gray-500 mb-1">リセット日</label>
          <input
            type="date"
            name="base_date_reset_date"
            defaultValue={baseDateResetDate ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {isPending ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
