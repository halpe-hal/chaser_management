"use client";

import { useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { ChevronDown, Check } from "lucide-react";
import { renderEmailBody, renderEmailSubject, type FollowUpTemplate } from "@/lib/types";
import type { DueTask } from "@/lib/customers";
import { AlertUrgencyBadge } from "@/components/StatusBadge";
import { SendEmailButton } from "@/components/SendEmailButton";
import { setSchemeStepCompleted } from "@/app/actions/followUpTasks";

function copy(text: string) {
  navigator.clipboard?.writeText(text);
}

export function FollowUpAlertList({
  tasks,
  templates,
  signature,
}: {
  tasks: DueTask[];
  templates: Record<number, FollowUpTemplate>;
  signature: string | null;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">本日対応が必要な追客はありません。</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {tasks.map((task) => {
        const template = templates[task.step.id];
        const expanded = expandedId === task.step.id * 100000 + task.customer.id;
        const expandKey = task.step.id * 100000 + task.customer.id;
        const elapsed = differenceInCalendarDays(new Date(), new Date(task.customer.reservation_date));
        const channelLabel = [task.step.use_phone && "電話", task.step.use_email && "メール"].filter(Boolean).join("・");

        const phoneScript = template?.phone_script?.replaceAll("{{name}}", task.customer.name) ?? "";
        const emailSubject = renderEmailSubject(template?.email_subject ?? null, task.customer.name);
        const emailBody = renderEmailBody(template?.email_body ?? null, task.customer.name, signature);

        return (
          <li key={`${task.customer.id}-${task.step.id}`} className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSchemeStepCompleted(task.customer.id, task.step.id, true)}
                  title="対応完了にする"
                  className="shrink-0 w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-transparent hover:text-emerald-600 hover:border-emerald-400 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${task.customer.id}`} className="font-medium text-gray-900 hover:underline truncate">
                      {task.customer.name}
                    </Link>
                    <AlertUrgencyBadge dueDate={task.due_date} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    予約日 {task.customer.reservation_date}（経過{elapsed}日）・{task.step.label}・{channelLabel}
                    {task.customer.phone && <>・{task.customer.phone}</>}
                    {task.email_sent_at && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-sky-50 text-sky-700 border-sky-300">
                        メール送信済み
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : expandKey)}
                  className="flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  トーク・テンプレート
                  <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 ml-9 grid gap-3 sm:grid-cols-2">
                {task.step.use_phone && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-500">電話トークマニュアル</p>
                      {template?.phone_script && (
                        <button onClick={() => copy(phoneScript)} className="text-xs text-brand hover:underline">
                          コピー
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {template?.phone_script ? phoneScript : "未設定（テンプレート管理で登録してください）"}
                    </p>
                  </div>
                )}
                {task.step.use_email && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-500">メールテンプレート</p>
                      {template?.email_body && (
                        <div className="flex items-center gap-3">
                          <button onClick={() => copy(`${emailSubject}\n\n${emailBody}`)} className="text-xs text-brand hover:underline">
                            コピー
                          </button>
                          <SendEmailButton customerId={task.customer.id} stepId={task.step.id} />
                        </div>
                      )}
                    </div>
                    {template?.email_subject && <p className="text-sm font-medium text-gray-800">件名：{emailSubject}</p>}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {template?.email_body ? emailBody : "未設定（テンプレート管理で登録してください）"}
                    </p>
                    {task.email_sent_at && <p className="text-xs text-sky-700 mt-1">※ 自動送信済みです。再送したい場合は「今すぐ送信」を押してください。</p>}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
