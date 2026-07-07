"use client";

import { useActionState, useTransition } from "react";
import { format } from "date-fns";
import { Clock, Trash2 } from "lucide-react";
import { CONTACT_TYPE_LABELS, type ContactLog, type ContactType } from "@/lib/types";
import { addContactLog, deleteContactLog } from "@/app/actions/contactLogs";

type FormState = { error?: string; success?: boolean } | null;

export function ContactLogPanel({ customerId, logs }: { customerId: number; logs: ContactLog[] }) {
  const boundAction = addContactLog.bind(null, customerId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(logId: number) {
    if (!window.confirm("この履歴を削除しますか？元に戻せません。")) return;
    startDeleteTransition(() => deleteContactLog(logId, customerId));
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        <div>
          <label className="block text-xs text-gray-500 mb-1">連絡種別</label>
          <select name="contact_type" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">メモ</label>
          <input type="text" name="note" placeholder="内容を記載" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          追加
        </button>
      </form>

      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="text-sm border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-semibold text-gray-700 tabular-nums shrink-0">
                {format(new Date(log.created_at), "yyyy/MM/dd HH:mm")}
              </span>
              <span className="font-medium text-gray-800">{CONTACT_TYPE_LABELS[log.contact_type]}</span>
              <button
                type="button"
                onClick={() => handleDelete(log.id)}
                disabled={isDeleting}
                title="削除"
                className="ml-auto p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {log.note && <p className="text-gray-600 mt-1 ml-6">{log.note}</p>}
          </li>
        ))}
        {logs.length === 0 && <p className="text-sm text-gray-400">まだ連絡履歴はありません。</p>}
      </ul>
    </div>
  );
}
