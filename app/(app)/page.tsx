import { getValidatedStoreId, isAdminUser } from "@/lib/stores";
import { computeDashboardStats, getStatusCounts, getStaffJoinRatesByStaff } from "@/lib/customers";
import { monthRangeToDateStrs } from "@/lib/date";
import { StatusCountCards } from "@/components/StatusCountCards";
import { DashboardStatsCards } from "@/components/DashboardStatsCards";
import { DashboardPeriodFilter } from "@/components/DashboardPeriodFilter";
import { StaffJoinRateTable } from "@/components/StaffJoinRateTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date_from?: string; date_to?: string }>;
}) {
  const { month = "", date_from = "", date_to = "" } = await searchParams;
  const storeId = await getValidatedStoreId();
  const isAdmin = await isAdminUser();

  const monthRange = month ? monthRangeToDateStrs(month) : null;
  const dateFrom = monthRange?.from ?? date_from;
  const dateTo = monthRange?.to ?? date_to;

  const counts = await getStatusCounts(storeId, { dateFrom, dateTo });
  const stats = computeDashboardStats(counts);
  const staffJoinRates = isAdmin ? await getStaffJoinRatesByStaff(storeId, { dateFrom, dateTo }) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      <DashboardPeriodFilter month={month} dateFrom={date_from} dateTo={date_to} />

      <DashboardStatsCards stats={stats} />

      <StatusCountCards counts={counts} />

      {staffJoinRates && <StaffJoinRateTable rates={staffJoinRates} />}
    </div>
  );
}
