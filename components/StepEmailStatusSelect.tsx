"use client";

import { useRouter } from "next/navigation";
import type { CustomerStatus } from "@/lib/types";

export function StepEmailStatusSelect({ value, options }: { value: CustomerStatus; options: CustomerStatus[] }) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => router.push(`/step-emails?status=${encodeURIComponent(e.target.value)}`)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
