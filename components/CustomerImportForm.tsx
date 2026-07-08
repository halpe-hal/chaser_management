"use client";

import { useRef, useState, useTransition } from "react";
import { importCustomersCsv, previewImportCsv, type CsvPreviewResult, type ImportResult } from "@/app/actions/importCustomers";
import type { CsvPlanRow } from "@/lib/csvImport";

const OUTCOME_LABEL: Record<CsvPlanRow["outcome"], string> = {
  import: "取り込む",
  rebook: "既存顧客を再予約済にして日時を更新",
  duplicate: "重複のためスキップ",
  no_date: "予約日不明のためスキップ",
};

export function CustomerImportForm({ storeId }: { storeId: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [plan, setPlan] = useState<CsvPlanRow[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  function resetResults() {
    setPlan(null);
    setPreviewError(null);
    setPreviewWarnings([]);
    setImportResult(null);
  }

  function handlePreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setPreviewError("CSVファイルを選択してください。");
      return;
    }
    resetResults();
    const formData = new FormData();
    formData.set("file", file);
    startPreview(async () => {
      const result: CsvPreviewResult = await previewImportCsv(storeId, formData);
      if (result.error) {
        setPreviewError(result.error);
        return;
      }
      setPlan(result.plan ?? []);
      setPreviewWarnings(result.warnings ?? []);
    });
  }

  function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startImport(async () => {
      const result = await importCustomersCsv(storeId, null, formData);
      setImportResult(result);
      if (!result.error) {
        setPlan(null);
      }
    });
  }

  const importCount = plan?.filter((r) => r.outcome === "import").length ?? 0;
  const rebookCount = plan?.filter((r) => r.outcome === "rebook").length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CSVファイル</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={resetResults}
          className="block w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">Shift_JIS（Excel等の標準形式）・UTF-8のどちらでも読み込めます。</p>
      </div>

      <button
        type="button"
        onClick={handlePreview}
        disabled={isPreviewing}
        className="bg-white text-brand border border-brand text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand/5 transition-colors disabled:opacity-50"
      >
        {isPreviewing ? "確認中..." : "プレビュー"}
      </button>

      {previewError && <p className="text-sm text-red-600">{previewError}</p>}

      {previewWarnings.length > 0 && (
        <ul className="text-sm text-amber-700 list-disc list-inside">
          {previewWarnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">お客様名</th>
                  <th className="text-left px-3 py-2 font-medium">メール</th>
                  <th className="text-left px-3 py-2 font-medium">電話番号</th>
                  <th className="text-left px-3 py-2 font-medium">ご予約日</th>
                  <th className="text-left px-3 py-2 font-medium">時間</th>
                  <th className="text-left px-3 py-2 font-medium">結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plan.map((row, i) => {
                  const isActive = row.outcome === "import" || row.outcome === "rebook";
                  return (
                    <tr key={i} className={isActive ? "text-gray-900" : "text-gray-400"}>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.email ?? "-"}</td>
                      <td className="px-3 py-2">{row.phone ?? "-"}</td>
                      <td className="px-3 py-2">{row.reservationDate ?? "-"}</td>
                      <td className="px-3 py-2">
                        {row.reservationTime
                          ? `${row.reservationTime}${row.reservationEndTime ? `〜${row.reservationEndTime}` : ""}`
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {OUTCOME_LABEL[row.outcome]}
                        {isActive && row.slotFull && "／満席のため表に非表示"}
                        {row.outcome === "rebook" && row.extraRebookIds.length > 0 && `／他${row.extraRebookIds.length}件も再予約済に更新`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600">
            {plan.length}件中 新規登録 {importCount}件・再予約更新 {rebookCount}件を行います。
          </p>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || (importCount === 0 && rebookCount === 0)}
            className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {isImporting ? "取り込み中..." : "この内容で取り込む"}
          </button>
        </div>
      )}

      {importResult?.error && <p className="text-sm text-red-600">{importResult.error}</p>}

      {importResult?.imported !== undefined && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-800">
          {importResult.total}件中 {importResult.imported}件を登録しました
          {importResult.skippedDuplicate ? `／重複スキップ：${importResult.skippedDuplicate}件` : ""}
          {importResult.skippedNoDate ? `／予約日不明でスキップ：${importResult.skippedNoDate}件` : ""}
          {importResult.unassignedSlot ? `／予約枠満席のためスケジュール表には非表示：${importResult.unassignedSlot}件` : ""}
          {importResult.rebooked ? `／既存顧客を再予約済に更新：${importResult.rebooked}件` : ""}
        </div>
      )}
    </div>
  );
}
