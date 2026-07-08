import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { MassEmailForm } from "@/components/MassEmailForm";

export default async function MassEmailPage() {
  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">一斉メール送信</h1>
        <p className="text-sm text-gray-500 mt-1">
          {storeName ? `${storeName} の` : ""}指定したステータスの顧客全員へ、同じ内容のメールを一度に送信します（ヘッダーの店舗セレクターで対象店舗を切り替えられます）。
          顧客同士にメールアドレスが見えないよう、宛先は店舗の送信元アドレス自身にし、対象の顧客はBCCで送信します。
        </p>
      </div>

      {storeId === null ? (
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 max-w-2xl">
          <MassEmailForm storeId={storeId} />
        </div>
      )}
    </div>
  );
}
