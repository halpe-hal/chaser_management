"use client";

import { useActionState } from "react";
import { importCustomersCsv, type ImportResult } from "@/app/actions/importCustomers";

export function CustomerImportForm({ storeId }: { storeId: number }) {
  const boundAction = importCustomersCsv.bind(null, storeId) as (
    prevState: ImportResult | null,
    formData: FormData
  ) => Promise<ImportResult>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CSVファイル</label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">Shift_JIS（Excel等の標準形式）・UTF-8のどちらでも読み込めます。</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "取り込み中..." : "取り込む"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state?.warnings && state.warnings.length > 0 && (
        <ul className="text-sm text-amber-700 list-disc list-inside">
          {state.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {state?.imported !== undefined && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800">
          {state.total}件中 {state.imported}件を登録しました
          {state.skippedDuplicate ? `／重複スキップ：${state.skippedDuplicate}件` : ""}
          {state.skippedNoDate ? `／予約日不明でスキップ：${state.skippedNoDate}件` : ""}
        </div>
      )}
    </form>
  );
}
