import type { CustomerStatus } from "@/lib/types";

const STATUS_STYLES: Record<CustomerStatus, string> = {
  検討: "bg-amber-50 text-amber-700 border-amber-300",
  事前キャンセル: "bg-rose-50 text-rose-700 border-rose-300",
  無断キャンセル: "bg-gray-100 text-gray-600 border-gray-300",
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function FlagBadge({ label, tone }: { label: string; tone: "mint" | "teal" }) {
  const styles =
    tone === "mint"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : "bg-teal-50 text-teal-700 border-teal-300";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles}`}>
      {label}
    </span>
  );
}

export function AlertUrgencyBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const overdue = due < today;
  const isToday = due.getTime() === today.getTime();

  if (overdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-300">
        期限超過
      </span>
    );
  }
  if (isToday) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-300">
        本日期日
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-sky-50 text-sky-700 border-sky-300">
      予定
    </span>
  );
}
