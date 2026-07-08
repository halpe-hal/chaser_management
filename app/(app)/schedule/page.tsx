import Link from "next/link";
import { getValidatedStoreId } from "@/lib/stores";
import { buildScheduleRows, getAllTimeSlots, getReservationsForDate, getScheduleCapacityForDate } from "@/lib/schedule";
import { buildStatusCounts, computeDashboardStats } from "@/lib/customers";
import { dayOfWeekForDateStr, todayStrTokyo } from "@/lib/date";
import type { CustomerStatus } from "@/lib/types";
import { ScheduleDateNav } from "@/components/ScheduleDateNav";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { ScheduleDayStats } from "@/components/ScheduleDayStats";
import { StatusCountCards } from "@/components/StatusCountCards";

const DAY_BREAKDOWN_STATUSES: CustomerStatus[] = [
  "入会（２年）",
  "入会（1年）",
  "入会（通常）",
  "検討",
  "事前キャンセル",
  "無断キャンセル",
];

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
  const dayCounts = buildStatusCounts(reservations);
  const dayStats = computeDashboardStats(dayCounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <Link
          href={`/customers/new?date=${dateStr}&store_id=${storeId}`}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          + 新規登録
        </Link>
      </div>

      <ScheduleDateNav date={dateStr} />

      <ScheduleDayStats stats={dayStats} />

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ステータス内訳</h2>
        <StatusCountCards counts={dayCounts} statuses={DAY_BREAKDOWN_STATUSES} wrap={false} />
      </div>

      <ScheduleGrid storeId={storeId} date={dateStr} rows={rows} capacity={capacity} reservations={reservations} />
    </div>
  );
}
