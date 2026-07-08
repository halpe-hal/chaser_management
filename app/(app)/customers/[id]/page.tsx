import { notFound } from "next/navigation";
import { getCustomer, getCompanions, getContactLogs, getFollowUpStepsForCustomer } from "@/lib/customers";
import { isAdminUser } from "@/lib/stores";
import { getStaffMembers } from "@/lib/staff";
import { updateCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/CustomerForm";
import { ContactLogPanel } from "@/components/ContactLogPanel";
import { FollowUpTaskList } from "@/components/FollowUpTaskList";
import { DeleteCustomerButton } from "@/components/DeleteCustomerButton";
import { CompanionSection } from "@/components/CompanionSection";

// 更新直後に古い内容が表示され続けることがないよう、キャッシュを使わせない
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  const [logs, tasks, isAdmin, staff, companions, primary] = await Promise.all([
    getContactLogs(customerId),
    getFollowUpStepsForCustomer(customer),
    isAdminUser(),
    getStaffMembers(customer.store_id),
    customer.paired_customer_id ? Promise.resolve([]) : getCompanions(customerId),
    customer.paired_customer_id ? getCustomer(customer.paired_customer_id) : Promise.resolve(null),
  ]);

  const boundUpdate = updateCustomer.bind(null, customerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{customer.name} さん</h1>
        {isAdmin && <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <CustomerForm
            action={boundUpdate}
            defaultValues={customer}
            staffByStore={{ [customer.store_id]: staff }}
            submitLabel="更新する"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">フォローアップタスク</h2>
          <FollowUpTaskList customerId={customer.id} tasks={tasks} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同伴者</h2>
        <CompanionSection customer={customer} companions={companions} primary={primary} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">追い連絡の履歴</h2>
        <ContactLogPanel customerId={customer.id} logs={logs} />
      </div>
    </div>
  );
}
