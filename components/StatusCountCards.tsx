import type { StatusCounts } from "@/lib/customers";

const CARDS: { key: keyof StatusCounts; label: string; tone: string }[] = [
  { key: "検討", label: "検討", tone: "text-amber-700" },
  { key: "事前キャンセル", label: "事前キャンセル", tone: "text-rose-700" },
  { key: "無断キャンセル", label: "無断キャンセル", tone: "text-gray-600" },
  { key: "rebooked", label: "再予約", tone: "text-teal-700" },
  { key: "joined", label: "入会", tone: "text-emerald-700" },
];

export function StatusCountCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {CARDS.map((c) => (
        <div key={c.key} className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.tone}`}>{counts[c.key]}</p>
        </div>
      ))}
    </div>
  );
}
