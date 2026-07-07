"use client";

import { useTransition } from "react";
import { setRebooked, setJoined } from "@/app/actions/customers";

export function CustomerFlags({
  customerId,
  rebooked,
  joined,
}: {
  customerId: number;
  rebooked: boolean;
  joined: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-6">
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={rebooked}
          disabled={isPending}
          onChange={(e) => startTransition(() => setRebooked(customerId, e.target.checked))}
          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        再予約チェック
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={joined}
          disabled={isPending}
          onChange={(e) => startTransition(() => setJoined(customerId, e.target.checked))}
          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        入会チェック
      </label>
    </div>
  );
}
