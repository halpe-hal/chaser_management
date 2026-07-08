"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "ダッシュボード", href: "/" },
  { label: "予約スケジュール", href: "/schedule" },
  { label: "顧客一覧", href: "/customers" },
  { label: "新規登録", href: "/customers/new" },
  { label: "テンプレート管理", href: "/templates" },
];

const ADMIN_NAV_ITEMS = [
  { label: "予約枠設定", href: "/schedule-settings" },
  { label: "スキーム設定", href: "/schemes" },
  { label: "スタッフ設定", href: "/staff" },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
