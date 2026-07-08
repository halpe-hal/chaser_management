import type { StaffJoinRate } from "@/lib/customers";

function formatRate(rate: number | null): string {
  return rate === null ? "-" : `${rate.toFixed(1)}%`;
}

export function StaffJoinRateTable({ rates }: { rates: StaffJoinRate[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-6 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">スタッフごとの入会率</h2>
        <p className="text-sm text-gray-500 mt-1">管理者アカウントにのみ表示されます。</p>
      </div>
      <table className="w-full text-sm mt-4">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left px-6 py-3 font-medium">対応スタッフ</th>
            <th className="text-left px-6 py-3 font-medium">来店数</th>
            <th className="text-left px-6 py-3 font-medium">入会率</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rates.map((r) => (
            <tr key={r.staffId ?? "unassigned"}>
              <td className="px-6 py-3 text-gray-900">{r.staffName}</td>
              <td className="px-6 py-3 text-gray-700">{r.visited}</td>
              <td className="px-6 py-3 text-gray-700">{formatRate(r.joinRate)}</td>
            </tr>
          ))}
          {rates.length === 0 && (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                データがありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
