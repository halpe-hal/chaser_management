"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToDateStr, formatDateJa } from "@/lib/date";

export function ScheduleDateNav({ date }: { date: string }) {
  const router = useRouter();

  function goTo(d: string) {
    router.push(`/schedule?date=${d}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => goTo(addDaysToDateStr(date, -1))}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        title="前日"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && goTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <span className="text-lg font-bold text-gray-900">{formatDateJa(date)}</span>
      </div>
      <button
        type="button"
        onClick={() => goTo(addDaysToDateStr(date, 1))}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        title="翌日"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
