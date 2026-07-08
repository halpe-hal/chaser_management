"use client";

import { useActionState } from "react";
import { updateEmailAutomation } from "@/app/actions/emailAutomation";
import type { StoreEmailAutomation } from "@/lib/types";

type FormState = { error?: string; success?: boolean } | null;

export function EmailAutomationSettings({
  storeId,
  automation,
}: {
  storeId: number;
  automation: StoreEmailAutomation | null;
}) {
  const boundAction = updateEmailAutomation.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">メール自動送信設定</h2>
      <p className="text-sm text-gray-500 mb-4">
        指定した時刻を過ぎたら、期日を迎えた追客メールを自動送信します（外部の定期実行サービスが数分おきにチェックしています）。電話も必要なステップはメールのみ自動送信され、対応自体は未完了のまま残ります。
      </p>
      <form action={formAction} className="space-y-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-700">保存しました。</p>}

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={automation?.enabled ?? false}
            className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          自動送信を有効にする
        </label>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs text-gray-500 mb-1">送信時刻</label>
            <input
              type="time"
              name="send_time"
              defaultValue={automation?.send_time?.slice(0, 5) ?? "10:00"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">送信元メールアドレス</label>
            <input
              type="email"
              name="from_email"
              defaultValue={automation?.from_email ?? ""}
              placeholder="hitoriwellness_kuki@kklia.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          送信元メールアドレスは、サーバー側（.env.local）に設定したSMTPアカウントと一致している必要があります。
        </p>

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
