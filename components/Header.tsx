import { createClient } from "@/lib/supabase/server";
import { getAvailableStores, getValidatedStoreId } from "@/lib/stores";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { NavLinks } from "@/components/NavLinks";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stores = await getAvailableStores();
  const selectedStoreId = await getValidatedStoreId();

  const label = (user?.user_metadata?.full_name as string | undefined) || user?.email || "";

  return (
    <header className="bg-brand text-white">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <span className="font-bold tracking-wide whitespace-nowrap">顧客管理</span>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3">
          <StoreSwitcher stores={stores} selectedStoreId={selectedStoreId} />
          <UserMenu label={label} />
        </div>
      </div>
    </header>
  );
}
