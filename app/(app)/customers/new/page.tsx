import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { getStaffMembersByStore } from "@/lib/staff";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; store_id?: string }>;
}) {
  const { date, time, store_id } = await searchParams;
  const stores = await getAvailableStores();
  const selectedStoreId = await getValidatedStoreId();
  const staffByStore = await getStaffMembersByStore(stores.map((s) => s.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <CustomerForm
          action={createCustomer}
          stores={stores}
          staffByStore={staffByStore}
          defaultValues={{
            store_id: (store_id ? Number(store_id) : undefined) ?? selectedStoreId ?? stores[0]?.id,
            reservation_date: date,
            reservation_time: time,
          }}
          submitLabel="登録する"
        />
      </div>
    </div>
  );
}
