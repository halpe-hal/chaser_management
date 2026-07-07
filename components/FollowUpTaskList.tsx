"use client";

import { useTransition } from "react";
import type { CustomerStepStatus } from "@/lib/customers";
import { setSchemeStepCompleted } from "@/app/actions/followUpTasks";
import { AlertUrgencyBadge } from "@/components/StatusBadge";
import { SendEmailButton } from "@/components/SendEmailButton";

export function FollowUpTaskList({ customerId, tasks }: { customerId: number; tasks: CustomerStepStatus[] }) {
  const [isPending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400">このステータスに対応する追客スキームが登録されていません。</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map(({ step, due_date, completed, email_sent_at }) => {
        const channelLabel = [step.use_phone && "電話", step.use_email && "メール"].filter(Boolean).join("・");
        return (
          <li key={step.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={completed}
                disabled={isPending}
                onChange={(e) => startTransition(() => setSchemeStepCompleted(customerId, step.id, e.target.checked))}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className={completed ? "text-gray-400 line-through" : "text-gray-800"}>
                {step.label}（期日：{due_date}・{channelLabel}）
              </span>
              {email_sent_at && !completed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-sky-50 text-sky-700 border-sky-300">
                  メール送信済み
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              {step.use_email && !completed && <SendEmailButton customerId={customerId} stepId={step.id} />}
              {!completed && <AlertUrgencyBadge dueDate={due_date} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
