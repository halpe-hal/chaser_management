"use client";

import { useState, useTransition } from "react";
import type { CustomerStatus } from "@/lib/types";
import { copySchemeToStatus } from "@/app/actions/followUpSchemes";

export function SchemeCopyForm({
  fromStatus,
  otherStatuses,
}: {
  fromStatus: CustomerStatus;
  otherStatuses: CustomerStatus[];
}) {
  const [toStatus, setToStatus] = useState<CustomerStatus>(otherStatuses[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCopy() {
    if (!window.confirm(`「${toStatus}」の現在のスキーム（ステップ・テンプレート）を削除し、「${fromStatus}」の内容で上書きします。よろしいですか？`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await copySchemeToStatus(fromStatus, toStatus);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">コピー先</label>
        <select
          value={toStatus}
          onChange={(e) => setToStatus(e.target.value as CustomerStatus)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {otherStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "コピー中..." : "コピーする"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
