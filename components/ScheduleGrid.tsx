import Link from "next/link";
import type { ScheduleRow } from "@/lib/schedule";
import type { Customer } from "@/lib/types";
import { STATUS_CARD_STYLES } from "@/lib/statusColors";

const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

export function ScheduleGrid({
  storeId,
  date,
  rows,
  capacity,
  reservations,
}: {
  storeId: number;
  date: string;
  rows: ScheduleRow[];
  capacity: number;
  reservations: Customer[];
}) {
  const slotColumns = Array.from({ length: capacity }, (_, i) => i + 1);

  // 同伴者（他の顧客に紐付いている）は自分の枠を持たず、主予約者のセルに一緒に表示するだけなので、
  // 枠への配置対象からは除外する。
  function customerAt(time: string, slot: number): Customer | undefined {
    return reservations.find(
      (c) => !c.paired_customer_id && c.reservation_time?.slice(0, 5) === time && c.slot_number === slot
    );
  }

  function companionsOf(customerId: number): Customer[] {
    return reservations.filter((c) => c.paired_customer_id === customerId);
  }

  // 終了時間が、以降の行のうち何行分にまたがるかを数える（終了時刻がなければ1行のみ）
  function computeRowSpan(startIndex: number, endTime: string | null): number {
    if (!endTime) return 1;
    let span = 1;
    for (let i = startIndex + 1; i < rows.length; i++) {
      if (rows[i].time < endTime) span++;
      else break;
    }
    return span;
  }

  // 列（予約枠）ごとに、直前の行のrowSpanでカバーされていて描画をスキップすべき行indexを記録する
  const skipUntilIndex = new Array(capacity + 1).fill(-1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="text-left px-4 py-3 font-medium border-b border-gray-100">時間</th>
            {slotColumns.map((slot) => (
              <th key={slot} className="text-left px-4 py-3 font-medium border-b border-gray-100">
                予約{CIRCLED_NUMBERS[slot - 1] ?? slot}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={capacity + 1} className="px-4 py-8 text-center text-gray-400">
                まだ受付時間が設定されていません（「予約枠設定」から登録してください）。
              </td>
            </tr>
          )}
          {rows.map((row, rowIndex) => (
            <tr key={row.time} className={`border-b border-gray-300 ${row.isOpen ? "" : "bg-gray-100"}`}>
              <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{row.time}</td>
              {slotColumns.map((slot) => {
                // 直前の行から始まった予約のrowSpanでこのセルはすでにカバーされている
                if (rowIndex <= skipUntilIndex[slot]) {
                  return null;
                }

                const customer = customerAt(row.time, slot);
                if (customer) {
                  const companions = companionsOf(customer.id);
                  const rowSpan = computeRowSpan(rowIndex, customer.reservation_end_time?.slice(0, 5) ?? null);
                  skipUntilIndex[slot] = rowIndex + rowSpan - 1;
                  return (
                    <td key={slot} rowSpan={rowSpan} className="px-2 py-2 align-top">
                      <div className="rounded-lg overflow-hidden divide-y divide-black/10 h-full flex flex-col">
                        <Link
                          href={`/customers/${customer.id}`}
                          className={`block px-3 py-2 font-medium hover:brightness-95 transition-[filter] ${STATUS_CARD_STYLES[customer.status]}`}
                        >
                          {customer.name} 様
                        </Link>
                        {companions.map((companion) => (
                          <Link
                            key={companion.id}
                            href={`/customers/${companion.id}`}
                            className={`block px-3 py-2 font-medium hover:brightness-95 transition-[filter] ${STATUS_CARD_STYLES[companion.status]}`}
                          >
                            {companion.name} 様
                          </Link>
                        ))}
                        {customer.reservation_end_time && (
                          <div className="px-3 py-1 text-xs font-normal text-gray-600 bg-black/5 mt-auto">
                            〜{customer.reservation_end_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                }
                if (!row.isOpen) {
                  return <td key={slot} className="px-4 py-3 text-gray-300">-</td>;
                }
                return (
                  <td key={slot} className="px-2 py-2">
                    <Link
                      href={`/customers/new?date=${date}&time=${row.time}&store_id=${storeId}`}
                      className="block rounded-lg px-3 py-2 border border-dashed border-gray-200 text-gray-300 hover:border-brand hover:text-brand transition-colors text-center"
                    >
                      ＋
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
