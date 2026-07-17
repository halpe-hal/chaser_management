"use client";

import { useState, useTransition } from "react";
import { CUSTOMER_STATUSES, type CustomerStatus, type StaffMember } from "@/lib/types";
import { previewMassEmail, sendMassEmail, type MassEmailResult } from "@/app/actions/massEmail";

export function MassEmailForm({ storeId, staffMembers }: { storeId: number; staffMembers: StaffMember[] }) {
  const [statuses, setStatuses] = useState<CustomerStatus[]>([]);
  const [staffId, setStaffId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [isPreviewing, startPreview] = useTransition();
  const [isSending, startSend] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [sampleNames, setSampleNames] = useState<string[]>([]);
  const [result, setResult] = useState<MassEmailResult | null>(null);

  function resetPreview() {
    setTargetCount(null);
    setSampleNames([]);
    setPreviewError(null);
    setResult(null);
  }

  function toggleStatus(status: CustomerStatus, checked: boolean) {
    setStatuses((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)));
    resetPreview();
  }

  function handlePreview() {
    if (statuses.length === 0) {
      setPreviewError("ステータスを選択してください。");
      return;
    }
    resetPreview();
    startPreview(async () => {
      const preview = await previewMassEmail(storeId, statuses, staffId ? Number(staffId) : null);
      if (preview.error) {
        setPreviewError(preview.error);
        return;
      }
      setTargetCount(preview.targetCount ?? 0);
      setSampleNames(preview.sampleNames ?? []);
    });
  }

  function handleSend() {
    if (statuses.length === 0 || !subject.trim() || !body.trim()) return;
    const staffLabel = staffId ? `（担当：${staffMembers.find((s) => String(s.id) === staffId)?.name ?? ""}）` : "";
    if (!window.confirm(`選択した${statuses.length}ステータス${staffLabel}の対象顧客 ${targetCount}件にメールを送信します。よろしいですか？`)) return;

    const formData = new FormData();
    statuses.forEach((s) => formData.append("status", s));
    if (staffId) formData.set("staff_id", staffId);
    formData.set("subject", subject);
    formData.set("body", body);

    startSend(async () => {
      const sendResult = await sendMassEmail(storeId, null, formData);
      setResult(sendResult);
      if (!sendResult.error) {
        resetPreview();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ステータス（複数選択可）</label>
        <div className="flex flex-wrap gap-3 border border-gray-200 rounded-lg p-3">
          {CUSTOMER_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={statuses.includes(s)}
                onChange={(e) => toggleStatus(s, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">対応スタッフ（任意）</label>
        <select
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            resetPreview();
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          {staffMembers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
        <p className="text-xs text-gray-500 mb-1">
          全員に同じ内容を1通で送るため、お客様名の差し込み（{"{{name}}"}）は使えません。署名は自動で末尾に付きます。
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={handlePreview}
        disabled={isPreviewing}
        className="bg-white text-brand border border-brand text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand/5 transition-colors disabled:opacity-50"
      >
        {isPreviewing ? "確認中..." : "対象を確認"}
      </button>

      {previewError && <p className="text-sm text-red-600">{previewError}</p>}

      {targetCount !== null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-gray-900">対象：{targetCount}件（メールアドレス登録ありの顧客のみ）</p>
          {sampleNames.length > 0 && (
            <p className="text-gray-500 mt-1">
              例：{sampleNames.join("、")}
              {targetCount > sampleNames.length ? " ほか" : ""}
            </p>
          )}
        </div>
      )}

      {targetCount !== null && targetCount > 0 && (
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !subject.trim() || !body.trim()}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {isSending ? "送信中..." : "送信する"}
        </button>
      )}

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result?.sent !== undefined && !result.error && (
        <p className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800">
          {result.sent}件に送信しました。
        </p>
      )}
    </div>
  );
}
