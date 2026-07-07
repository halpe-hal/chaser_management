"use client";

import { useRouter } from "next/navigation";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";

export function StatusFilterSelect({ value }: { value: CustomerStatus }) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => router.push(`/templates?status=${encodeURIComponent(e.target.value)}`)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
    >
      {CUSTOMER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
