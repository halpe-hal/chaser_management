import Link from "next/link";
import { getValidatedStoreId } from "@/lib/stores";
import { getCustomers } from "@/lib/customers";
import { CustomerRow } from "@/components/CustomerRow";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/types";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const storeId = await getValidatedStoreId();
  const customers = await getCustomers(storeId, {
    status: status as CustomerStatus | "all",
    search: q,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">顧客一覧</h1>
        <Link href="/customers/new" className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          + 新規登録
        </Link>
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
