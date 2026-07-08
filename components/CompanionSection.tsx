import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { CompanionAddButton } from "@/components/CompanionAddButton";
import type { Customer } from "@/lib/types";

export function CompanionSection({
  customer,
  companions,
  primary,
}: {
  customer: Customer;
  companions: Customer[];
  primary: Customer | null;
}) {
  if (primary) {
    return (
      <p className="text-sm text-gray-600">
        <Link href={`/customers/${primary.id}`} className="text-brand hover:underline font-medium">
          {primary.name} 様
        </Link>
        の同伴者です。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {companions.length === 0 && <p className="text-sm text-gray-400">まだ同伴者は登録されていません。</p>}
      {companions.map((c) => (
        <Link
          key={c.id}
          href={`/customers/${c.id}`}
          className="flex items-center justify-between border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900">{c.name} 様</span>
          <StatusBadge status={c.status} />
        </Link>
      ))}
      <CompanionAddButton primaryCustomerId={customer.id} />
    </div>
  );
}
