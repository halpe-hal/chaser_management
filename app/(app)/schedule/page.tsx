import Link from "next/link";
import { getValidatedStoreId } from "@/lib/stores";
import { buildScheduleRows, getAllTimeSlots, getReservationsForDate, getScheduleCapacityForDate } from "@/lib/schedule";
import { dayOfWeekForDateStr, todayStrTokyo } from "@/lib/date";
import { ScheduleDateNav } from "@/components/ScheduleDateNav";
import { ScheduleGrid } from "@/components/ScheduleGrid";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const dateStr = date ?? todayStrTokyo();
  const storeId = await getValidatedStoreId();

  if (storeId === null) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      </div>
    );
  }

  const [allSlots, capacity, reservations] = await Promise.all([
    getAllTimeSlots(storeId),
    getScheduleCapacityForDate(storeId, dateStr),
    getReservationsForDate(storeId, dateStr),
  ]);

  const reservationTimes = reservations
    .map((c) => c.reservation_time)
    .filter((t): t is string => Boolean(t));
  const rows = buildScheduleRows(allSlots, dayOfWeekForDateStr(dateStr), reservationTimes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">予約スケジュール</h1>
        <Link
          href={`/customers/new?date=${dateStr}&store_id=${storeId}`}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          + 新規登録
        </Link>
      </div>

      <ScheduleDateNav date={dateStr} />

      <ScheduleGrid storeId={storeId} date={dateStr} rows={rows} capacity={capacity} reservations={reservations} />
    </div>
  );
}
