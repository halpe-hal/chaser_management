import type { StatusCounts } from "@/lib/customers";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";
import { STATUS_ACCENT_COLORS } from "@/lib/statusColors";

export function StatusCountCards({
  counts,
  statuses = CUSTOMER_STATUSES,
  wrap = true,
}: {
  counts: StatusCounts;
  statuses?: CustomerStatus[];
  // false の場合、折り返さず1行に収める（列幅を均等に自動調整）
  wrap?: boolean;
}) {
  return (
    <div className={wrap ? "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4" : "grid grid-flow-col auto-cols-fr gap-4"}>
      {statuses.map((status) => (
        <div
          key={status}
          className="flex items-stretch gap-3 bg-white rounded-2xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow min-w-0"
        >
          <span className={`w-1 rounded-full shrink-0 ${STATUS_ACCENT_COLORS[status]}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 truncate">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{counts[status]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
