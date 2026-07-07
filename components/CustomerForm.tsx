"use client";

import { useActionState, useState } from "react";
import { CUSTOMER_STATUSES, type Customer, type CustomerStatus } from "@/lib/types";
import type { Store } from "@/lib/stores";

type FormState = { error?: string; success?: boolean } | null;
type FormAction = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function CustomerForm({
  action,
  stores,
  defaultValues,
  submitLabel,
}: {
  action: FormAction;
  stores?: Store[];
  defaultValues?: Partial<Customer>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [status, setStatus] = useState<CustomerStatus>(defaultValues?.status ?? "検討");

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{state.error}</div>
      )}
      {state?.success && (
        <div className="px-3 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">保存しました。</div>
      )}

      {stores && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">店舗</label>
          <select name="store_id" defaultValue={defaultValues?.store_id} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">お客様名</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
          <input
            type="tel"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            type="email"
            name="email"
            defaultValue={defaultValues?.email ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ご予約日</label>
          <input
            type="date"
            name="reservation_date"
            required
            defaultValue={defaultValues?.reservation_date}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "事前キャンセル" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">事前キャンセル日</label>
          <input
            type="date"
            name="pre_cancel_date"
            required
            defaultValue={defaultValues?.pre_cancel_date ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">この日を起算日として追客アラートが計算されます。</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
