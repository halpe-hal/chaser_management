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

// "YYYY-MM-DD" の曜日を返す（0=日 1=月 ... 6=土）。カレンダー上の日付そのものなのでタイムゾーンに依存しない。
export function dayOfWeekForDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function weekdayLabelJa(dayOfWeek: number): string {
  return WEEKDAY_LABELS_JA[dayOfWeek];
}

// 例: "2026-07-11" → "7月11日（土）"
export function formatDateJa(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}月${d}日（${weekdayLabelJa(dayOfWeekForDateStr(dateStr))}）`;
}

// "YYYY-MM" からその月の初日・末日を求める（ダッシュボードの月別集計フィルター用）
export function monthRangeToDateStrs(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const to = addDaysToDateStr(addMonthsToDateStr(from, 1), -1);
  return { from, to };
}

// メール・CSV取り込み時、終了時刻がちょうどの時でない場合に次の正時へ繰り上げる（例: 14:45 → 15:00）
export function ceilTimeToHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (m === 0) return `${String(h).padStart(2, "0")}:00`;
  const nextHour = (h + 1) % 24;
  return `${String(nextHour).padStart(2, "0")}:00`;
}
