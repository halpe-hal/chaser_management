"use client";

import { useRouter } from "next/navigation";
import { setSelectedStore } from "@/app/actions/store";
import type { Store } from "@/lib/stores";

export function StoreSwitcher({
  stores,
  selectedStoreId,
}: {
  stores: Store[];
  selectedStoreId: number | null;
}) {
  const router = useRouter();

  if (stores.length === 0) return null;

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value, 10);
    await setSelectedStore(id);
    router.refresh();
  }

  return (
    <select
      value={selectedStoreId ?? stores[0]?.id ?? ""}
      onChange={handleChange}
      className="bg-brand-dark text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
    >
      {stores.map((s) => (
        <option key={s.id} value={s.id} className="text-black">
          {s.name}
        </option>
      ))}
    </select>
  );
}
