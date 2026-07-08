"use client";

import { useActionState, useEffect, useState } from "react";
import { createStaffMember } from "@/app/actions/staffMembers";

export function StaffMemberAddForm({ storeId }: { storeId: number }) {
  const boundAction = createStaffMember.bind(null, storeId);
  const [state, formAction, isPending] = useActionState(boundAction, null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form key={resetKey} action={formAction} className="flex flex-wrap items-end gap-3 border border-dashed border-gray-300 rounded-xl p-3">
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <div>
        <label className="block text-xs text-gray-500 mb-1">名前</label>
        <input type="text" name="name" required placeholder="例：西村 慎平" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
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
