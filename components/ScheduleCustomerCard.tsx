"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { setCustomerCheckedIn } from "@/app/actions/customers";
import { scheduleCardColorClass } from "@/lib/statusColors";
import type { Customer } from "@/lib/types";

// 予約管理画面のカードの1行分（お客様名の部分）。常にステータス色で表示し、
// ステータスが「未来店」の間だけ「来店中にする」で来店中専用の色に切り替えられる。
// 複数人が1枚のカードにまとまる（親のoverflow-hiddenで角丸に切り抜かれる）ので、
// メニューはPortalでdocument.body直下に描画してクリップされないようにする。
export function ScheduleCustomerCard({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((v) => !v);
  }

  const isCheckedIn = Boolean(customer.checked_in_at);
  const colorClass = scheduleCardColorClass(customer.status, isCheckedIn);
  const canToggleCheckedIn = customer.status === "未来店";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`block w-full text-left px-3 py-2 font-medium hover:brightness-95 transition-[filter] ${colorClass}`}
      >
        {customer.name} 様
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="w-36 bg-white rounded-xl shadow-lg border border-black/5 py-1 z-50"
          >
            <Link
              href={`/customers/${customer.id}`}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              編集する
            </Link>
            {canToggleCheckedIn && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await setCustomerCheckedIn(customer.id, !isCheckedIn);
                    setOpen(false);
                  });
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isCheckedIn ? "未来店に戻す" : "来店中にする"}
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
