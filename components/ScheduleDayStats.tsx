import type { DashboardStats } from "@/lib/customers";

function formatRate(rate: number | null): string {
  return rate === null ? "-" : `${rate.toFixed(1)}%`;
}

export function ScheduleDayStats({ stats }: { stats: DashboardStats }) {
  const tiles = [
    { label: "予約数", value: String(stats.totalReservations) },
    { label: "来店数", value: String(stats.visitedCount) },
    { label: "来店率", value: formatRate(stats.visitRate) },
    { label: "入会数", value: String(stats.memberCount) },
    { label: "入会率", value: formatRate(stats.joinRate) },
  ];

  return (
    <div className="grid grid-flow-col auto-cols-fr gap-4">
      {tiles.map(({ label, value }) => (
        <div key={label} className="rounded-2xl shadow-sm p-4 bg-white border border-black/5 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 truncate">{value}</p>
        </div>
      ))}
    </div>
  );
}
