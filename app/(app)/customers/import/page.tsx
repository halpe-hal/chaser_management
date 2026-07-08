import { getValidatedStoreId, getAvailableStores } from "@/lib/stores";
import { CustomerImportForm } from "@/components/CustomerImportForm";

export default async function CustomersImportPage() {
  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CSVインポート</h1>
        <p className="text-sm text-gray-500 mt-1">
          ペライチなどからダウンロードした予約情報のCSVファイルをアップロードして、
          {storeName ? `${storeName}の` : ""}顧客として一括登録します。ステータスは全て「未来店」で登録されます。
          メールアドレス・電話番号・予約日が同じ顧客が既に登録されている場合は自動的にスキップされます。
        </p>
      </div>

      {storeId === null ? (
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 max-w-4xl">
          <CustomerImportForm storeId={storeId} />
        </div>
      )}
    </div>
  );
}
