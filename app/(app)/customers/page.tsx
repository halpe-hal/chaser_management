import Link from "next/link";
import { getValidatedStoreId } from "@/lib/stores";
import { getCustomers, type CustomerSortBy } from "@/lib/customers";
import { getStaffMembers } from "@/lib/staff";
import { CustomerRow } from "@/components/CustomerRow";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; date_from?: string; date_to?: string; sort?: string; staff_id?: string }>;
}) {
  const { status = "all", q = "", date_from = "", date_to = "", sort = "reservation_date", staff_id = "all" } = await searchParams;
  const storeId = await getValidatedStoreId();
  const [customers, staffMembers] = await Promise.all([
    getCustomers(storeId, {
      status: status as CustomerStatus | "all",
      search: q,
      dateFrom: date_from,
      dateTo: date_to,
      sortBy: sort as CustomerSortBy,
      staffId: staff_id === "all" ? "all" : Number(staff_id),
    }),
    storeId !== null ? getStaffMembers(storeId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">顧客一覧</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/customers/import"
            className="bg-white text-brand border border-brand text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand/5 transition-colors"
          >
            CSVインポート
          </Link>
          <Link href="/customers/new" className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
            + 新規登録
          </Link>
        </div>
      </div>

      <form className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">ステータス</label>
          <select name="status" defaultValue={status} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">すべて</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">名前・電話番号で検索</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="例：山田"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ご予約日（から）</label>
          <input type="date" name="date_from" defaultValue={date_from} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ご予約日（まで）</label>
          <input type="date" name="date_to" defaultValue={date_to} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">対応スタッフ</label>
          <select name="staff_id" defaultValue={staff_id} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">すべて</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">並び順</label>
          <select name="sort" defaultValue={sort} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="reservation_date">ご予約日（新しい順）</option>
            <option value="created_at">登録日時（新しい順）</option>
          </select>
        </div>
        <button type="submit" className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          絞り込み
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">お客様名</th>
              <th className="text-left px-4 py-3 font-medium">ご予約日</th>
              <th className="text-left px-4 py-3 font-medium">電話番号</th>
              <th className="text-left px-4 py-3 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <CustomerRow key={c.id} customer={c} />
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  該当する顧客がいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
