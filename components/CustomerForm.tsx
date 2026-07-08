"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CUSTOMER_STATUSES, type Customer, type CustomerStatus, type StaffMember } from "@/lib/types";
import type { Store } from "@/lib/stores";

type FormState = { error?: string; success?: boolean } | null;
type FormAction = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function CustomerForm({
  action,
  stores,
  staffByStore = {},
  defaultValues,
  submitLabel,
}: {
  action: FormAction;
  stores?: Store[];
  staffByStore?: Record<number, StaffMember[]>;
  defaultValues?: Partial<Customer>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);
  const [status, setStatus] = useState<CustomerStatus>(defaultValues?.status ?? "未来店");
  const [storeId, setStoreId] = useState<number | undefined>(defaultValues?.store_id ?? stores?.[0]?.id);
  const [staffMemberId, setStaffMemberId] = useState<number | null>(defaultValues?.staff_member_id ?? null);
  const staffOptions = storeId !== undefined ? staffByStore[storeId] ?? [] : [];
  // 同伴者はご予約日・時間・対応スタッフが主予約者と共通のため、この画面からは変更できない
  const isCompanion = Boolean(defaultValues?.paired_customer_id);

  // 保存後にサーバー側で再取得された最新値が届いたら、表示もそれに合わせる
  // （保存直後にNext.jsのフォームリセット等で古い値に戻って見えるのを防ぐ）
  useEffect(() => {
    setStatus(defaultValues?.status ?? "未来店");
    setStoreId(defaultValues?.store_id ?? stores?.[0]?.id);
    setStaffMemberId(defaultValues?.staff_member_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues?.status, defaultValues?.store_id, defaultValues?.staff_member_id]);

  // 保存成功後、revalidatePathだけでは表示中のページに確実に反映されないことがあるため、
  // 明示的にサーバーコンポーネントの再取得を要求する
  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{state.error}</div>
      )}
      {state?.success && (
        <div className="px-3 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">保存しました。</div>
      )}

      {stores && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">店舗</label>
          <select
            name="store_id"
            value={storeId}
            onChange={(e) => setStoreId(Number(e.target.value))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">お客様名</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>


      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
          <input
            type="tel"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            type="email"
            name="email"
            defaultValue={defaultValues?.email ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ご予約日</label>
          <input
            type="date"
            name={isCompanion ? undefined : "reservation_date"}
            required={!isCompanion}
            disabled={isCompanion}
            defaultValue={defaultValues?.reservation_date}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
          {isCompanion && <input type="hidden" name="reservation_date" defaultValue={defaultValues?.reservation_date ?? ""} />}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ご予約時間</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              name={isCompanion ? undefined : "reservation_time"}
              disabled={isCompanion}
              defaultValue={defaultValues?.reservation_time?.slice(0, 5) ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
            <span className="text-gray-400 text-sm">〜</span>
            <input
              type="time"
              name={isCompanion ? undefined : "reservation_end_time"}
              disabled={isCompanion}
              defaultValue={defaultValues?.reservation_end_time?.slice(0, 5) ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          {isCompanion && (
            <>
              <input type="hidden" name="reservation_time" defaultValue={defaultValues?.reservation_time?.slice(0, 5) ?? ""} />
              <input
                type="hidden"
                name="reservation_end_time"
                defaultValue={defaultValues?.reservation_end_time?.slice(0, 5) ?? ""}
              />
            </>
          )}
        </div>
      </div>
      {isCompanion && (
        <p className="text-xs text-gray-500 -mt-2">ご予約日・時間・対応スタッフは主予約者と共通のため、この画面からは変更できません。</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CustomerStatus)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">対応スタッフ</label>
        <select
          name={isCompanion ? undefined : "staff_member_id"}
          value={staffMemberId ?? ""}
          onChange={(e) => setStaffMemberId(e.target.value ? Number(e.target.value) : null)}
          disabled={isCompanion}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">未設定</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {isCompanion && <input type="hidden" name="staff_member_id" value={staffMemberId ?? ""} />}
        {!isCompanion && staffOptions.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">この店舗にはまだスタッフが登録されていません（管理者が「スタッフ設定」で登録できます）。</p>
        )}
      </div>

      {status === "事前キャンセル" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">事前キャンセル日</label>
          <input
            type="date"
            name="pre_cancel_date"
            required
            defaultValue={defaultValues?.pre_cancel_date ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">この日を起算日として追客アラートが計算されます。</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
