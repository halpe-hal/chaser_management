"use client";

import { useState, useTransition } from "react";
import { createCompanion } from "@/app/actions/customers";

export function CompanionAddButton({ primaryCustomerId }: { primaryCustomerId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createCompanion(primaryCustomerId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "登録中..." : "+ 同伴者を登録する"}
      </button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
