import { getValidatedStoreId } from "@/lib/stores";
import { computeDashboardStats, getStatusCounts } from "@/lib/customers";
import { StatusCountCards } from "@/components/StatusCountCards";
import { DashboardStatsCards } from "@/components/DashboardStatsCards";

export default async function DashboardPage() {
  const storeId = await getValidatedStoreId();
  const counts = await getStatusCounts(storeId);
  const stats = computeDashboardStats(counts);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      <DashboardStatsCards stats={stats} />

      <StatusCountCards counts={counts} />
    </div>
  );
}
