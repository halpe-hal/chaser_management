"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addTimeSlot, addTimeSlotRange, deleteTimeSlot, setTimeSlotDay } from "@/app/actions/scheduleSettings";
import { weekdayLabelJa } from "@/lib/date";
import type { StoreTimeSlot } from "@/lib/types";

type FormState = { error?: string; success?: boolean } | null;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ScheduleTimeSlotMatrix({ storeId, slots }: { storeId: number; slots: StoreTimeSlot[] }) {
  const [isPending, startTransition] = useTransition();

  const times = Array.from(new Set(slots.map((s) => s.time.slice(0, 5)))).sort();
  const openDaysByTime = new Map<string, Set<number>>();
  for (const time of times) {
    openDaysByTime.set(time, new Set(slots.filter((s) => s.time.slice(0, 5) === time).map((s) => s.day_of_week)));
  }

  function toggle(time: string, day: number, enabled: boolean) {
    startTransition(() => {
      setTimeSlotDay(storeId, time, day, enabled);
    });
  }

  function handleDelete(time: string) {
    if (!window.confirm(`${time} の枠を削除しますか？（全曜日から削除されます）`)) return;
    startTransition(() => {
      deleteTimeSlot(storeId, time);
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray-500">時間</th>
              {DAYS.map((day) => (
                <th key={day} className="px-3 py-2 text-xs text-gray-500">
                  {weekdayLabelJa(day)}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {times.length === 0 && (
              <tr>
                <td colSpan={DAYS.length + 2} className="px-3 py-4 text-sm text-gray-400">
                  まだ時間枠が登録されていません。
                </td>
              </tr>
            )}
            {times.map((time) => (
              <tr key={time} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-700">{time}</td>
                {DAYS.map((day) => {
                  const checked = openDaysByTime.get(time)?.has(day) ?? false;
                  return (
                    <td key={day} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPending}
                        onChange={(e) => toggle(time, day, e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(time)}
                    title="この時間を削除"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TimeSlotRangeAddForm storeId={storeId} />
      <TimeSlotAddForm storeId={storeId} />
    </div>
  );
}

function TimeSlotRangeAddForm({ storeId }: { storeId: number }) {
  const boundAction = addTimeSlotRange.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form key={resetKey} action={formAction} className="border border-dashed border-gray-300 rounded-xl p-3 space-y-3">
      <p className="text-xs text-gray-500">範囲でまとめて追加（1時間区切り。例：10:00〜17:00 → 10:00,11:00,...,16:00 の枠を追加）</p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">開始時間</label>
          <input type="time" name="start_time" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">終了時間</label>
          <input type="time" name="end_time" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          + まとめて追加
        </button>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">対象曜日</p>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label key={day} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="days" value={day} className="w-4 h-4" />
              {weekdayLabelJa(day)}
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}

function TimeSlotAddForm({ storeId }: { storeId: number }) {
  const boundAction = addTimeSlot.bind(null, storeId) as (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  const [state, formAction, isPending] = useActionState(boundAction, null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state?.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form key={resetKey} action={formAction} className="border border-dashed border-gray-300 rounded-xl p-3 space-y-3">
      <p className="text-xs text-gray-500">個別に1件だけ追加</p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">時間</label>
          <input type="time" name="time" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          + 追加
        </button>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">対象曜日</p>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label key={day} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="days" value={day} className="w-4 h-4" />
              {weekdayLabelJa(day)}
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}
