import { CalendarDays, DoorOpen, Repeat, UserPlus, Users, type LucideIcon } from "lucide-react";
import type { DashboardStats } from "@/lib/customers";

function formatRate(rate: number | null): string {
  return rate === null ? "-" : `${rate.toFixed(1)}%`;
}

interface StatTile {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  chipClass: string;
}

export function DashboardStatsCards({ stats }: { stats: DashboardStats }) {
  const tiles: StatTile[] = [
    {
      label: "予約数",
      value: String(stats.totalReservations),
      icon: CalendarDays,
      iconClass: "text-blue-600",
      chipClass: "bg-blue-50",
    },
    {
      label: "会員数",
      value: String(stats.memberCount),
      icon: Users,
      iconClass: "text-indigo-600",
      chipClass: "bg-indigo-50",
    },
    {
      label: "来店率",
      value: formatRate(stats.visitRate),
      icon: DoorOpen,
      iconClass: "text-teal-600",
      chipClass: "bg-teal-50",
    },
    {
      label: "入会率",
      value: formatRate(stats.joinRate),
      icon: UserPlus,
      iconClass: "text-emerald-600",
      chipClass: "bg-emerald-50",
    },
    {
      label: "再予約率",
      value: formatRate(stats.rebookRate),
      icon: Repeat,
      iconClass: "text-violet-600",
      chipClass: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {tiles.map(({ label, value, icon: Icon, iconClass, chipClass }) => (
        <div
          key={label}
          className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${chipClass}`}>
            <Icon className={`w-5 h-5 ${iconClass}`} strokeWidth={2} />
          </div>
          <p className="text-xs font-medium text-gray-500 mt-3">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}
