"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { StaffMember } from "@/lib/types";
import { updateStaffMember, deleteStaffMember } from "@/app/actions/staffMembers";

type FormState = { error?: string; success?: boolean } | null;

export function StaffMemberRow({ staff }: { staff: StaffMember }) {
  const boundAction = updateStaffMember.bind(null, staff.id) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  function handleDelete() {
    if (!window.confirm(`「${staff.name}」を削除しますか？`)) return;
    deleteStaffMember(staff.id);
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border border-gray-100 rounded-xl p-3">
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <div>
        <label className="block text-xs text-gray-500 mb-1">名前</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={staff.name}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
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
