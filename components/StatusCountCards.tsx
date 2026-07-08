import type { StatusCounts } from "@/lib/customers";
import type { CustomerStatus } from "@/lib/types";

const CARDS: { key: CustomerStatus; tone: string }[] = [
  { key: "未来店", tone: "text-sky-700" },
  { key: "入会（２年）", tone: "text-emerald-700" },
  { key: "入会（1年）", tone: "text-emerald-700" },
  { key: "入会（通常）", tone: "text-emerald-700" },
  { key: "検討", tone: "text-amber-700" },
  { key: "再予約済", tone: "text-teal-700" },
  { key: "事前キャンセル", tone: "text-rose-700" },
  { key: "無断キャンセル", tone: "text-gray-600" },
];

export function StatusCountCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {CARDS.map((c) => (
        <div key={c.key} className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
          <p className="text-xs text-gray-500">{c.key}</p>
          <p className={`text-2xl font-bold mt-1 ${c.tone}`}>{counts[c.key]}</p>
        </div>
      ))}
    </div>
  );
}
