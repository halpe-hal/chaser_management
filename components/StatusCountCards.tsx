import type { StatusCounts } from "@/lib/customers";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";
import { STATUS_ACCENT_COLORS } from "@/lib/statusColors";

// wrapがtrueの時、何列目で折り返すかを指定する場合に使う（Tailwindはリテラルなクラス名しか
// ビルドしないので、動的に "grid-cols-" + n を組み立てず、あらかじめ完全な形で用意しておく）
const WRAP_COLUMNS_CLASS: Record<4 | 6, string> = {
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-3 sm:grid-cols-6",
};

export function StatusCountCards({
  counts,
  statuses = CUSTOMER_STATUSES,
  wrap = true,
  columns,
}: {
  counts: StatusCounts;
  statuses?: CustomerStatus[];
  // false の場合、折り返さず1行に収める（列幅を均等に自動調整）
  wrap?: boolean;
  // wrapがtrueの時、何列で折り返すか（未指定ならデフォルトのレスポンシブ列数）
  columns?: 4 | 6;
}) {
  const gridClass = !wrap
    ? "grid grid-flow-col auto-cols-fr gap-4"
    : columns
      ? `grid ${WRAP_COLUMNS_CLASS[columns]} gap-4`
      : "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4";

  return (
    <div className={gridClass}>
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
