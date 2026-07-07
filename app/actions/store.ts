"use server";

import { cookies } from "next/headers";

export async function setSelectedStore(storeId: number) {
  const cookieStore = await cookies();
  cookieStore.set("selected_store_id", String(storeId), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
