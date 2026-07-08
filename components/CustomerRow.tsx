"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import type { Customer } from "@/lib/types";

export function CustomerRow({ customer }: { customer: Customer }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/customers/${customer.id}`)}
      className="hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-4 py-3">
        <Link
          href={`/customers/${customer.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-gray-900 hover:underline"
        >
          {customer.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-gray-600">{customer.reservation_date}</td>
      <td className="px-4 py-3 text-gray-600">{customer.phone || "-"}</td>
      <td className="px-4 py-3">
        <StatusBadge status={customer.status} />
      </td>
    </tr>
  );
}
