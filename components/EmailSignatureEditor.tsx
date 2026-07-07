"use client";

import { useActionState } from "react";
import { updateStoreSignature } from "@/app/actions/emailSignature";

type FormState = { error?: string; success?: boolean } | null;

export function EmailSignatureEditor({ storeId, signature }: { storeId: number; signature: string | null }) {
  const boundAction = updateStoreSignature.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">メール署名</h2>
      <p className="text-sm text-gray-500 mb-4">この店舗の全メールテンプレートの末尾に自動で付加されます。</p>
      <form action={formAction} className="space-y-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-700">保存しました。</p>}
        <textarea
          name="signature"
          rows={4}
          defaultValue={signature ?? ""}
          placeholder={"例：\nHITORIWELLNESS 久喜店\nTEL: 000-0000-0000"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
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
