"use client";

import { useState, useTransition } from "react";
import { sendFollowUpEmailNow } from "@/app/actions/manualEmail";

export function SendEmailButton({ customerId, stepId }: { customerId: number; stepId: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  function handleClick() {
    if (!window.confirm("このお客様にメールを送信しますか？")) return;
    startTransition(async () => {
      const result = await sendFollowUpEmailNow(customerId, stepId);
      setMessage(result.error ? { text: result.error, error: true } : { text: "送信しました" });
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-brand hover:underline disabled:opacity-50"
      >
        {isPending ? "送信中..." : "今すぐ送信"}
      </button>
      {message && (
        <span className={`text-xs font-medium ${message.error ? "text-red-600" : "text-emerald-700"}`}>{message.text}</span>
      )}
    </span>
  );
}
