import type { StatusCounts } from "@/lib/customers";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";

const CARD_STYLES: Record<CustomerStatus, string> = {
  未来店: "bg-gray-100 text-gray-700",
  "入会（２年）": "bg-orange-200 text-orange-900",
  "入会（1年）": "bg-purple-100 text-purple-900",
  "入会（通常）": "bg-sky-300 text-sky-900",
  検討: "bg-gray-500 text-white",
  事前キャンセル: "bg-violet-500 text-white",
  無断キャンセル: "bg-red-600 text-white",
  再予約済: "bg-teal-200 text-teal-900",
};

export function StatusCountCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {CUSTOMER_STATUSES.map((status) => (
        <div key={status} className={`rounded-2xl shadow-sm p-4 ${CARD_STYLES[status]}`}>
          <p className="text-xs font-medium opacity-80">{status}</p>
          <p className="text-2xl font-bold mt-1">{counts[status]}</p>
        </div>
      ))}
    </div>
  );
}
