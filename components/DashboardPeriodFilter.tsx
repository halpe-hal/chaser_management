import Link from "next/link";

export function DashboardPeriodFilter({
  month,
  dateFrom,
  dateTo,
}: {
  month: string;
  dateFrom: string;
  dateTo: string;
}) {
  const hasFilter = Boolean(month || dateFrom || dateTo);

  return (
    <form className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">月で絞り込み</label>
        <input type="month" name="month" defaultValue={month} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">期間（から）</label>
        <input type="date" name="date_from" defaultValue={dateFrom} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">期間（まで）</label>
        <input type="date" name="date_to" defaultValue={dateTo} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <button type="submit" className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
        絞り込み
      </button>
      {hasFilter && (
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline pb-2">
          全期間に戻す
        </Link>
      )}
      <p className="w-full text-xs text-gray-400">
        「ご予約日」を基準に集計します。月を指定した場合は期間（から・まで）より優先されます。
      </p>
    </form>
  );
}
