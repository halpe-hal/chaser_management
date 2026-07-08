import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/permissions";

export interface Store {
  id: number;
  name: string;
}

export const getAvailableStores = cache(async (): Promise<Store[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  if (ADMIN_EMAILS.includes(user.email ?? "")) {
    const { data } = await supabase.from("stores").select("id, name").order("id");
    return (data ?? []) as Store[];
  }

  const { data } = await supabase
    .from("user_store_permissions")
    .select("store_id, stores(id, name)")
    .eq("user_id", user.id);

  return ((data ?? []) as unknown as { stores: Store }[])
    .map((r) => r.stores)
    .sort((a, b) => a.id - b.id);
});

export async function getSelectedStoreId(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("selected_store_id")?.value;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return isNaN(parsed) ? null : parsed;
}

export async function getValidatedStoreId(): Promise<number | null> {
  const stores = await getAvailableStores();
  if (stores.length === 0) return null;
  const selected = await getSelectedStoreId();
  if (selected && stores.some((s) => s.id === selected)) return selected;
  return stores[0].id;
}
