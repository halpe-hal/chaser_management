import { getAvailableStores, getValidatedStoreId, isAdminUser } from "@/lib/stores";
import { getStaffMembers } from "@/lib/staff";
import { StaffMemberRow } from "@/components/StaffMemberRow";
import { StaffMemberAddForm } from "@/components/StaffMemberAddForm";

export default async function StaffPage() {
  const isAdmin = await isAdminUser();

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <p className="text-sm text-gray-500">このページは管理者のみ閲覧できます。</p>
      </div>
    );
  }

  const storeId = await getValidatedStoreId();
  const stores = await getAvailableStores();
  const storeName = stores.find((s) => s.id === storeId)?.name ?? "";
  const staff = storeId !== null ? await getStaffMembers(storeId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スタッフ設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          {storeName ? `${storeName} の` : ""}対応スタッフを登録・編集・削除します（ヘッダーの店舗セレクターで対象店舗を切り替えられます）。ここに登録した名前が、顧客登録・編集の「対応スタッフ」欄に表示されます。
        </p>
      </div>

      {storeId === null ? (
        <p className="text-sm text-gray-500">店舗が選択されていません。</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 space-y-3">
          {staff.length === 0 && <p className="text-sm text-gray-400">まだスタッフが登録されていません。</p>}
          {staff.map((s) => (
            <StaffMemberRow key={s.id} staff={s} />
          ))}
          <StaffMemberAddForm storeId={storeId} />
        </div>
      )}
    </div>
  );
}
