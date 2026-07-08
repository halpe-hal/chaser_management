"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "ダッシュボード", href: "/" },
  { label: "追客管理", href: "/chaser" },
  { label: "予約管理", href: "/schedule" },
  { label: "顧客一覧", href: "/customers" },
];

const SETTINGS_ITEMS = [
  { label: "ステップメール管理", href: "/step-emails" },
  { label: "一斉メール送信", href: "/mass-email" },
  { label: "予約枠設定", href: "/schedule-settings" },
  { label: "スタッフ設定", href: "/staff" },
];

export function NavLinks() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  const isSettingsActive = SETTINGS_ITEMS.some((item) => isActive(item.href));

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            isActive(item.href) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}

      <div className="relative group">
        <button
          type="button"
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            isSettingsActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          設定
        </button>
        <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-20">
          <div className="bg-white rounded-lg shadow-lg border border-black/5 py-1 min-w-[10rem]">
            {SETTINGS_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-sm whitespace-nowrap ${
                  isActive(item.href) ? "text-brand font-semibold bg-brand/5" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
