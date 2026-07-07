import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";

export default async function NewCustomerPage() {
  const stores = await getAvailableStores();
  const selectedStoreId = await getValidatedStoreId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <CustomerForm
          action={createCustomer}
          stores={stores}
          defaultValues={{ store_id: selectedStoreId ?? stores[0]?.id }}
          submitLabel="登録する"
        />
      </div>
    </div>
  );
}
