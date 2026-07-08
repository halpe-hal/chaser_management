"use client";

import { useActionState } from "react";
import type { FollowUpSchemeStep, FollowUpTemplate } from "@/lib/types";
import { updateTemplate } from "@/app/actions/templates";

type FormState = { error?: string; success?: boolean } | null;

export function TemplateEditor({ step, template }: { step: FollowUpSchemeStep; template: FollowUpTemplate }) {
  const boundAction = updateTemplate.bind(null, template.store_id, step.id) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);

  const channelLabel = [step.use_phone && "電話", step.use_email && "メール"].filter(Boolean).join("・");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-gray-900">{step.label}</h3>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
          {channelLabel}
        </span>
        {step.active_until && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-brand/10 text-brand-dark border-brand/30">
            プレオープン期間限定（〜{step.active_until}）
          </span>
        )}
        {step.fixed_date && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-brand/10 text-brand-dark border-brand/30">
            固定日：{step.fixed_date}
          </span>
        )}
      </div>
      <form action={formAction} className="space-y-4">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-700">保存しました。</p>}

        {step.use_phone && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話トークマニュアル</label>
            <textarea
              name="phone_script"
              rows={4}
              defaultValue={template.phone_script ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
        {step.use_email && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メール件名</label>
              <input
                type="text"
                name="email_subject"
                defaultValue={template.email_subject ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メール本文</label>
              <p className="text-xs text-gray-500 mb-1">
                <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code> と入力すると、表示・コピー時にお客様名に置き換わります（例：{"{{name}}"} 様）。署名は自動で末尾に付きます。
              </p>
              <textarea
                name="email_body"
                rows={5}
                defaultValue={template.email_body ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
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
