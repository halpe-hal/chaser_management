// 日本時間（Asia/Tokyo）基準の日付・時刻ユーティリティ。
// サーバーのタイムゾーン設定に依存せず「今日」「現在時刻」を求めるため、
// toISOString() や new Date() のローカルタイムには頼らない。

export function todayStrTokyo(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export function nowTimeStrTokyo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 「翌月の同じ日」のようなカレンダー月単位の加算。対象月に同じ日が無い場合
// （例: 1/31 + 1ヶ月）は月末にクランプする（1/31 + 1ヶ月 → 2/28 または 2/29）。
export function addMonthsToDateStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetMonthFirstDay = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(targetMonthFirstDay.getUTCFullYear(), targetMonthFirstDay.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(d, daysInTargetMonth);
  return new Date(Date.UTC(targetMonthFirstDay.getUTCFullYear(), targetMonthFirstDay.getUTCMonth(), clampedDay))
    .toISOString()
    .slice(0, 10);
}

// スキームステップの起算日からの期日を計算する（月→日の順で加算）
export function addIntervalToDateStr(dateStr: string, days: number, months: number): string {
  return addDaysToDateStr(addMonthsToDateStr(dateStr, months), days);
}
