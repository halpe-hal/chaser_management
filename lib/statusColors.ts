import type { CustomerStatus } from "@/lib/types";

// ダッシュボードのステータス件数カードと同じ配色。他の画面でも同じ色で
// ステータスを表現したい場合はここを参照する（色の定義箇所を一元化するため）。
export const STATUS_CARD_STYLES: Record<CustomerStatus, string> = {
  未来店: "bg-gray-100 text-gray-700",
  "入会（２年）": "bg-orange-200 text-orange-900",
  "入会（1年）": "bg-purple-100 text-purple-900",
  "入会（通常）": "bg-sky-300 text-sky-900",
  検討: "bg-gray-500 text-white",
  "見込みなし（来店済）": "bg-black text-white",
  事前キャンセル: "bg-violet-500 text-white",
  無断キャンセル: "bg-red-600 text-white",
  "見込みなし（未来店）": "bg-black text-white",
  再予約済: "bg-teal-200 text-teal-900",
};

// ダッシュボードのステータス件数カード用のアクセントカラー（同系色・白カード＋左バーの控えめな配色）
export const STATUS_ACCENT_COLORS: Record<CustomerStatus, string> = {
  未来店: "bg-gray-300",
  "入会（２年）": "bg-orange-400",
  "入会（1年）": "bg-purple-400",
  "入会（通常）": "bg-sky-500",
  検討: "bg-gray-500",
  事前キャンセル: "bg-violet-500",
  無断キャンセル: "bg-red-600",
  "見込みなし（来店済）": "bg-gray-900",
  "見込みなし（未来店）": "bg-gray-900",
  再予約済: "bg-teal-500",
};

// 予約管理画面で「来店中にする」を選べるステータス（まだ来店の結果が確定していない人たち）
export const CHECK_IN_ELIGIBLE_STATUSES: readonly CustomerStatus[] = ["未来店", "再予約済"];

// 予約管理画面のカードに表示する色。
// 「未来店」はcheck_in_atが付くまで白、付いたら（＝来店中）グレー。
// 「再予約済」は普段通りステータス色（teal）のままだが、来店中にした時だけ同じグレーにする。
// それ以外のステータスは常にステータス本来の色（このロジックの対象外）。
export function scheduleCardColorClass(status: CustomerStatus, checkedIn: boolean): string {
  if (checkedIn && CHECK_IN_ELIGIBLE_STATUSES.includes(status)) {
    return "bg-gray-300 text-gray-900";
  }
  if (status === "未来店") {
    return "bg-white text-gray-700";
  }
  return STATUS_CARD_STYLES[status];
}

// 予約管理画面のカード枠線。未来店の人だけグレーの枠を付け、それ以外は枠なし（透明）にする。
// Tailwindはソース上にリテラルで書かれたクラス名しかCSSを生成しないため、
// 文字列を組み立てて border-* を動的に作る（例: .replace("bg-", "border-")）のは避け、
// ここでは常に完全な形のクラス名を直接書く。
export function scheduleCardBorderClass(status: CustomerStatus): string {
  return status === "未来店" ? "border-gray-300" : "border-transparent";
}
