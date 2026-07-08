import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { getAllTimeSlots, getCapacityOverrides, getDefaultScheduleCapacity } from "@/lib/schedule";
import { ScheduleCapacityForm } from "@/components/ScheduleCapacityForm";
import { ScheduleTimeSlotMatrix } from "@/components/ScheduleTimeSlotMatrix";
import { ScheduleCapacityOverrides } from "@/components/ScheduleCapacityOverrides";

export default async function ScheduleSettingsPage() {
  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";
  const [slots, capacity, capacityOverrides] =
    storeId !== null
      ? await Promise.all([getAllTimeSlots(storeId), getDefaultScheduleCapacity(storeId), getCapacityOverrides(storeId)])
      : [[], 3, []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">予約枠設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          {storeName ? `${storeName} の` : ""}
          予約管理の表に表示する曜日ごとの受付時間と、同時受け入れ人数（列数）を設定します（ヘッダーの店舗セレクターで対象店舗を切り替えられます）。
        </p>
      </div>

      {storeId === null ? (
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">基本の同時受け入れ人数</h2>
            <ScheduleCapacityForm storeId={storeId} capacity={capacity} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">期間限定の人数上書き</h2>
            <p className="text-xs text-gray-500 mb-3">指定した期間だけ、基本の人数より多い（少ない）人数で受け付けたい場合に設定します（例：6/27〜6/28のみ5名）。</p>
            <ScheduleCapacityOverrides storeId={storeId} overrides={capacityOverrides} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">曜日ごとの受付時間</h2>
            <ScheduleTimeSlotMatrix storeId={storeId} slots={slots} />
          </div>
        </>
      )}
    </div>
  );
}
