import type { StatusCounts } from "@/lib/customers";
import { CUSTOMER_STATUSES } from "@/lib/types";
import { STATUS_CARD_STYLES } from "@/lib/statusColors";

export function StatusCountCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {CUSTOMER_STATUSES.map((status) => (
        <div key={status} className={`rounded-2xl shadow-sm p-4 ${STATUS_CARD_STYLES[status]}`}>
          <p className="text-xs font-medium opacity-80">{status}</p>
          <p className="text-2xl font-bold mt-1">{counts[status]}</p>
        </div>
      ))}
    </div>
  );
}
