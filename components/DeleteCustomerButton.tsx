"use client";

import { useState, useTransition } from "react";
import { deleteCustomer } from "@/app/actions/customers";

export function DeleteCustomerButton({ customerId, customerName }: { customerId: number; customerName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`「${customerName}」を削除しますか？連絡履歴・フォローアップの記録もすべて削除され、元に戻せません。`)) return;
    startTransition(async () => {
      const result = await deleteCustomer(customerId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "削除中..." : "この顧客を削除する"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
