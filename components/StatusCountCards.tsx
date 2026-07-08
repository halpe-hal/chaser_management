import type { StatusCounts } from "@/lib/customers";
import { CUSTOMER_STATUSES } from "@/lib/types";
import { STATUS_ACCENT_COLORS } from "@/lib/statusColors";

export function StatusCountCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
      {CUSTOMER_STATUSES.map((status) => (
        <div
          key={status}
          className="flex items-stretch gap-3 bg-white rounded-2xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow"
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
