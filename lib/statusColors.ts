import type { CustomerStatus } from "@/lib/types";

// ダッシュボードのステータス件数カードと同じ配色。他の画面でも同じ色で
// ステータスを表現したい場合はここを参照する（色の定義箇所を一元化するため）。
export const STATUS_CARD_STYLES: Record<CustomerStatus, string> = {
  未来店: "bg-gray-100 text-gray-700",
  "入会（２年）": "bg-orange-200 text-orange-900",
  "入会（1年）": "bg-purple-100 text-purple-900",
  "入会（通常）": "bg-sky-300 text-sky-900",
  検討: "bg-gray-500 text-white",
  事前キャンセル: "bg-violet-500 text-white",
  無断キャンセル: "bg-red-600 text-white",
  再予約済: "bg-teal-200 text-teal-900",
};
