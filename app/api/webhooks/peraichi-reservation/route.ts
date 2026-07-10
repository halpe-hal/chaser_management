import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ceilTimeToHour, todayStrTokyo } from "@/lib/date";
import { assignSlotNumber, getScheduleCapacityForDate } from "@/lib/schedule";
import { detectPartySizeFromText, withPartySizeSuffix } from "@/lib/partySize";
import { findRebookMatches } from "@/lib/customers";

// 外部の自動化ツール（Google Apps Script）からの都度呼び出しなので、キャッシュを使わせず必ず生きた状態で実行する
export const dynamic = "force-dynamic";

// このいずれかの文言が本文（どのフィールドでもよい）に含まれているメールだけを取り込む
const TARGET_COURSE_KEYWORDS = ["無料見学予約", "無料体験予約"];

// 来店確認のリマインダーメール（新規予約ではなく、予約情報を再掲しているだけ）はこの文言を含む。
// TARGET_COURSE_KEYWORDSにもマッチしてしまうため、先にこちらで除外する。
const REMINDER_EMAIL_KEYWORDS = ["ご予約日が近くなりました"];

function pick(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function bodyText(body: Record<string, unknown>): string {
  return Object.values(body)
    .filter((v): v is string => typeof v === "string")
    .join("\n");
}

function matchesTargetCourse(body: Record<string, unknown>): boolean {
  return TARGET_COURSE_KEYWORDS.some((kw) => bodyText(body).includes(kw));
}

function isReminderEmail(body: Record<string, unknown>): boolean {
  return REMINDER_EMAIL_KEYWORDS.some((kw) => bodyText(body).includes(kw));
}

function toDateStr(value: string): string | null {
  const m = value.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// 「14:00〜14:45」のような文字列から開始・終了時刻を抜き出す（1つ目がなければ開始のみ）
function extractTimeRange(value: string): { start: string | null; end: string | null } {
  const matches = value.match(/\d{1,2}:\d{2}/g) ?? [];
  const normalize = (t: string) => {
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  };
  return {
    start: matches[0] ? normalize(matches[0]) : null,
    end: matches[1] ? normalize(matches[1]) : null,
  };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.PERAICHI_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const storeId = Number(new URL(request.url).searchParams.get("store_id"));
  if (!storeId) {
    return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // 来店確認のリマインダーメールは新規予約ではないので取り込まない
  if (isReminderEmail(body)) {
    return NextResponse.json({ skipped: true, reason: "reminder email" });
  }

  // 「無料見学予約」「無料体験予約」の文言が見当たらないメールは対象外として無視する
  if (!matchesTargetCourse(body)) {
    return NextResponse.json({ skipped: true, reason: "target course keyword not found" });
  }

  // 呼び出し元でどんなフィールド名を付けても拾えるよう、日本語・英語どちらの表記も許容する
  const rawName = pick(body, ["name", "お名前", "名前"]);
  const partySizeField = pick(body, ["人数", "参加人数", "ご来店人数", "来店人数", "count", "people"]);
  const allBodyText = Object.values(body)
    .filter((v): v is string => typeof v === "string")
    .join("\n");
  const partySize = partySizeField ? parseInt(partySizeField, 10) || null : detectPartySizeFromText(allBodyText);
  // 予約時は同伴者の名前が分からないことが多いため、2名以上と分かる場合は代表者名の末尾に人数を付記する
  const name = withPartySizeSuffix(rawName, partySize);
  const email = pick(body, ["email", "メールアドレス"]) || null;
  const phone = pick(body, ["phone", "電話番号"]) || null;
  const reservationDateRaw = pick(body, ["reservation_datetime", "reservation_date", "ご予約日時", "予約日時"]);
  // 予約日時が取得できない場合も登録自体は行い、起算日は当日にする
  const reservationDate = toDateStr(reservationDateRaw) ?? todayStrTokyo();

  // 開始・終了時刻は専用フィールドがあればそれを優先し、なければ予約日時の文字列から抽出する
  const startTimeField = pick(body, ["start_time", "reservation_start_time", "開始時間", "予約開始時間"]);
  const endTimeField = pick(body, ["end_time", "reservation_end_time", "終了時間", "予約終了時間"]);
  const timeRangeFromText = extractTimeRange(reservationDateRaw);
  const reservationTime = startTimeField || timeRangeFromText.start;
  const reservationEndTimeRaw = endTimeField || timeRangeFromText.end;
  // ちょうどの時でない終了時刻は次の正時へ繰り上げる（例: 14:00〜14:45 → 14:00〜15:00）
  const reservationEndTime = reservationEndTimeRaw ? ceilTimeToHour(reservationEndTimeRaw) : null;

  if (!rawName) {
    return NextResponse.json({ skipped: true, reason: "name missing" });
  }

  const supabase = createAdminClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("customers")
    .select("id, email, phone")
    .eq("store_id", storeId)
    .eq("reservation_date", reservationDate);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const isDuplicate = (existingRows ?? []).some(
    (c) => (email && c.email === email) || (phone && c.phone === phone)
  );
  if (isDuplicate) {
    return NextResponse.json({ skipped: true, reason: "duplicate" });
  }

  // 同じ電話番号・メールアドレスの既存顧客がいれば、新規登録は行わず、その顧客を
  // 「再予約済」にした上で新しい予約日時へ移動させる（重複レコードを作らないため）
  const rebookMatches = await findRebookMatches(supabase, storeId, { email, phone });
  const [primaryMatch, ...extraMatches] = rebookMatches;

  // 予約時間が取れた場合のみ、その日時の空き枠を見て表示位置（slot_number）を割り当てる。
  // 満席でも登録自体は行い、その場合はスケジュール表には表示されない（顧客一覧には残る）。
  let slotNumber: number | null = null;
  if (reservationTime) {
    const capacity = await getScheduleCapacityForDate(storeId, reservationDate, supabase);
    slotNumber = await assignSlotNumber(supabase, storeId, reservationDate, reservationTime, capacity);
  }

  // 複数マッチしてしまった場合、最新の1件だけを移動させ、それ以外は再予約済にするだけにとどめる
  if (extraMatches.length > 0) {
    await supabase
      .from("customers")
      .update({ status: "再予約済", ever_rebooked_at: new Date().toISOString() })
      .in("id", extraMatches.map((m) => m.id));
  }

  if (primaryMatch) {
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name,
        email,
        phone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        reservation_end_time: reservationEndTime,
        slot_number: slotNumber,
        status: "再予約済",
        pre_cancel_date: null,
        ever_rebooked_at: new Date().toISOString(),
      })
      .eq("id", primaryMatch.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ rebooked: true, customerId: primaryMatch.id });
  }

  const { error: insertError } = await supabase.from("customers").insert({
    store_id: storeId,
    name,
    email,
    phone,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    reservation_end_time: reservationEndTime,
    slot_number: slotNumber,
    status: "未来店",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ created: true });
}
