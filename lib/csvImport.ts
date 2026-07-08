import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";
import { ceilTimeToHour } from "@/lib/date";
import { detectPartySizeFromText, withPartySizeSuffix } from "@/lib/partySize";
import type { CustomerStatus } from "@/lib/types";

export interface ParsedReservationRow {
  name: string;
  email: string | null;
  phone: string | null;
  reservationDate: string | null; // "YYYY-MM-DD"
  reservationTime: string | null; // "HH:mm"
  reservationEndTime: string | null; // "HH:mm"（正時に繰り上げ済み）
}

export interface CsvParseResult {
  rows: ParsedReservationRow[];
  warnings: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{9,13}$/;
const DATE_RE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/;

// ペライチなど日本語CSVエクスポートはShift_JIS(CP932)であることが多い。
// UTF-8として読んで置換文字が出るようならCP932として読み直す。
function decodeCsvBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("�")) return utf8;
  return iconv.decode(buffer, "cp932");
}

function findByHeader(headers: string[], include: string[], exclude: string[] = []): number {
  return headers.findIndex((h) => include.every((k) => h.includes(k)) && !exclude.some((k) => h.includes(k)));
}

// includeGroups の各配列は「いずれかの語を含む」条件（OR）。配列同士は先勝ちで判定する。
function findByHeaderAny(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
}

function findByValue(records: string[][], test: (v: string) => boolean): number {
  const sampleRows = records.slice(1, 6);
  const colCount = records[0]?.length ?? 0;
  for (let col = 0; col < colCount; col++) {
    if (sampleRows.some((r) => test((r[col] ?? "").trim()))) return col;
  }
  return -1;
}

function toDateStr(value: string): string | null {
  const m = value.trim().match(DATE_RE);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const TIME_RE = /(\d{1,2}):(\d{2})/;

function toTimeStr(value: string): string | null {
  const m = value.trim().match(TIME_RE);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// ペライチ等の予約CSVをパースし、氏名・メール・電話・予約日を抽出する。
// 見出し文字列のキーワード一致を優先し、見つからない場合は値のパターン（メール形式・電話番号・日付）から推測する。
export function parseReservationCsv(buffer: Buffer): CsvParseResult {
  const text = decodeCsvBuffer(buffer);
  const records: string[][] = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });
  const warnings: string[] = [];

  if (records.length < 2) {
    return { rows: [], warnings: ["データ行が見つかりませんでした。"] };
  }

  const headers = records[0].map((h) => (h ?? "").trim());

  let nameIdx = findByHeader(headers, ["名前"]);
  let emailIdx = findByHeader(headers, ["メール"]);
  let phoneIdx = findByHeader(headers, ["電話"], ["サブ"]);
  let dateIdx = findByHeader(headers, ["予約", "日"], ["終了", "申込"]);
  const endDateIdx = findByHeader(headers, ["終了"]);
  const partySizeIdx = findByHeaderAny(headers, ["人数", "数量"]);

  if (emailIdx === -1) emailIdx = findByValue(records, (v) => EMAIL_RE.test(v));
  if (phoneIdx === -1) phoneIdx = findByValue(records, (v) => PHONE_RE.test(v.replace(/[-\s]/g, "")));
  if (dateIdx === -1) dateIdx = findByValue(records, (v) => DATE_RE.test(v));

  if (nameIdx === -1) {
    warnings.push("お名前の列を特定できませんでした。ヘッダーに「お名前」を含む列があるか確認してください。");
  }
  if (dateIdx === -1) {
    warnings.push("予約日の列を特定できませんでした。日付が正しく取り込めていない可能性があります。");
  }

  const rows: ParsedReservationRow[] = [];
  for (const record of records.slice(1)) {
    const rawName = nameIdx >= 0 ? (record[nameIdx] ?? "").trim() : "";
    if (!rawName) continue;

    const startRaw = dateIdx >= 0 ? record[dateIdx] ?? "" : "";
    const endRaw = endDateIdx >= 0 ? record[endDateIdx] ?? "" : "";
    const reservationEndTimeRaw = toTimeStr(endRaw);

    const partySizeRaw = partySizeIdx >= 0 ? (record[partySizeIdx] ?? "").trim() : "";
    const partySize = partySizeRaw ? parseInt(partySizeRaw, 10) || null : detectPartySizeFromText(record.join("\n"));
    // 予約時は同伴者の名前が分からないことが多いため、2名以上と分かる場合は代表者名の末尾に人数を付記する
    const name = withPartySizeSuffix(rawName, partySize);

    rows.push({
      name,
      email: emailIdx >= 0 ? (record[emailIdx] ?? "").trim() || null : null,
      phone: phoneIdx >= 0 ? (record[phoneIdx] ?? "").trim() || null : null,
      reservationDate: dateIdx >= 0 ? toDateStr(startRaw) : null,
      reservationTime: toTimeStr(startRaw),
      // ちょうどの時でない終了時刻は次の正時へ繰り上げる（例: 14:00〜14:45 → 14:00〜15:00）
      reservationEndTime: reservationEndTimeRaw ? ceilTimeToHour(reservationEndTimeRaw) : null,
    });
  }

  return { rows, warnings };
}

export interface ExistingCustomerRow {
  id: number;
  email: string | null;
  phone: string | null;
  reservation_date: string;
  reservation_time: string | null;
  slot_number: number | null;
  status: CustomerStatus;
  created_at: string;
}

export interface CsvPlanRow {
  name: string;
  email: string | null;
  phone: string | null;
  reservationDate: string | null;
  reservationTime: string | null;
  reservationEndTime: string | null;
  outcome: "import" | "rebook" | "duplicate" | "no_date";
  slotNumber: number | null;
  slotFull: boolean;
  // outcome === "rebook" のとき、新しい予約情報へ更新・移動させる既存顧客のID（重複レコードを作らないため）
  rebookTargetId: number | null;
  // 電話番号・メールアドレスが一致する既存顧客が複数見つかった場合、移動対象以外は「再予約済」にするだけにとどめる
  extraRebookIds: number[];
}

interface RebookCandidate {
  id: number;
  created_at: string;
}

// パースしたCSV行と既存顧客データから、実際に取り込んだ場合の結果（登録／再予約／重複スキップ／枠の空き状況）を
// 計算する。DBへの書き込みは行わない純粋関数にしておくことで、プレビューと実際の取り込みで同じロジックを使い、
// 表示内容と実際の結果が食い違わないようにしている。
export function buildCsvImportPlan(
  rows: ParsedReservationRow[],
  existingRows: ExistingCustomerRow[],
  resolveCapacity: (date: string) => number
): CsvPlanRow[] {
  const existingKeys = new Set(existingRows.map((c) => `${c.email ?? ""}:${c.phone ?? ""}:${c.reservation_date}`));

  // 電話番号・メールアドレスが一致する既存顧客（まだ再予約済でないもの）を、作成日時が新しい順に持っておく。
  // CSV内の複数行が同じ既存顧客を取り合わないよう、マッチした分はその都度リストから取り除く。
  const byEmail = new Map<string, RebookCandidate[]>();
  const byPhone = new Map<string, RebookCandidate[]>();
  for (const c of existingRows) {
    if (c.status === "再予約済") continue;
    const candidate: RebookCandidate = { id: c.id, created_at: c.created_at };
    if (c.email) {
      if (!byEmail.has(c.email)) byEmail.set(c.email, []);
      byEmail.get(c.email)!.push(candidate);
    }
    if (c.phone) {
      if (!byPhone.has(c.phone)) byPhone.set(c.phone, []);
      byPhone.get(c.phone)!.push(candidate);
    }
  }
  const byCreatedAtDesc = (a: RebookCandidate, b: RebookCandidate) => b.created_at.localeCompare(a.created_at);
  byEmail.forEach((list) => list.sort(byCreatedAtDesc));
  byPhone.forEach((list) => list.sort(byCreatedAtDesc));

  function takeRebookMatches(email: string | null, phone: string | null): RebookCandidate[] {
    const merged = new Map<number, RebookCandidate>();
    (email ? byEmail.get(email) ?? [] : []).forEach((c) => merged.set(c.id, c));
    (phone ? byPhone.get(phone) ?? [] : []).forEach((c) => merged.set(c.id, c));
    const matches = Array.from(merged.values()).sort(byCreatedAtDesc);

    const usedIds = new Set(matches.map((m) => m.id));
    if (email && byEmail.has(email)) byEmail.set(email, byEmail.get(email)!.filter((c) => !usedIds.has(c.id)));
    if (phone && byPhone.has(phone)) byPhone.set(phone, byPhone.get(phone)!.filter((c) => !usedIds.has(c.id)));

    return matches;
  }

  // 予約枠（date+time）ごとに、既に使われているslot_numberを集計しておく（CSV内の複数行も同じ枠を取り合うため逐次更新する）
  const usedSlotsByDateTime = new Map<string, Set<number>>();
  for (const c of existingRows) {
    if (!c.reservation_time || c.slot_number === null) continue;
    const key = `${c.reservation_date}|${c.reservation_time.slice(0, 5)}`;
    if (!usedSlotsByDateTime.has(key)) usedSlotsByDateTime.set(key, new Set());
    usedSlotsByDateTime.get(key)!.add(c.slot_number);
  }

  function assignSlot(date: string, time: string): number | null {
    const capacity = resolveCapacity(date);
    const key = `${date}|${time}`;
    const used = usedSlotsByDateTime.get(key) ?? new Set<number>();
    for (let slot = 1; slot <= capacity; slot++) {
      if (!used.has(slot)) {
        used.add(slot);
        usedSlotsByDateTime.set(key, used);
        return slot;
      }
    }
    return null;
  }

  const plan: CsvPlanRow[] = [];
  for (const row of rows) {
    const base = {
      name: row.name,
      email: row.email,
      phone: row.phone,
      reservationDate: row.reservationDate,
      reservationTime: row.reservationTime,
      reservationEndTime: row.reservationEndTime,
    };

    if (!row.reservationDate) {
      plan.push({ ...base, outcome: "no_date", slotNumber: null, slotFull: false, rebookTargetId: null, extraRebookIds: [] });
      continue;
    }

    const key = `${row.email ?? ""}:${row.phone ?? ""}:${row.reservationDate}`;
    if (existingKeys.has(key)) {
      plan.push({ ...base, outcome: "duplicate", slotNumber: null, slotFull: false, rebookTargetId: null, extraRebookIds: [] });
      continue;
    }
    existingKeys.add(key);

    const [target, ...extra] = takeRebookMatches(row.email, row.phone);

    let slotNumber: number | null = null;
    if (row.reservationTime) {
      slotNumber = assignSlot(row.reservationDate, row.reservationTime);
    }
    const slotFull = Boolean(row.reservationTime) && slotNumber === null;

    plan.push({
      ...base,
      outcome: target ? "rebook" : "import",
      slotNumber,
      slotFull,
      rebookTargetId: target?.id ?? null,
      extraRebookIds: extra.map((c) => c.id),
    });
  }

  return plan;
}
