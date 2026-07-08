import type { DashboardStats } from "@/lib/customers";

function formatRate(rate: number | null): string {
  return rate === null ? "-" : `${rate.toFixed(1)}%`;
}

export function ScheduleDayStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="rounded-2xl shadow-sm p-4 bg-white border border-black/5 flex-1 min-w-[8rem]">
        <p className="text-xs font-medium text-gray-500">この日の予約数</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{stats.totalReservations}</p>
      </div>
      <div className="rounded-2xl shadow-sm p-4 bg-white border border-black/5 flex-1 min-w-[8rem]">
        <p className="text-xs font-medium text-gray-500">来店率</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{formatRate(stats.visitRate)}</p>
      </div>
      <div className="rounded-2xl shadow-sm p-4 bg-white border border-black/5 flex-1 min-w-[8rem]">
        <p className="text-xs font-medium text-gray-500">入会率</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{formatRate(stats.joinRate)}</p>
      </div>
    </div>
  );
}
