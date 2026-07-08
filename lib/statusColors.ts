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
