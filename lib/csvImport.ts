import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";

export interface ParsedReservationRow {
  name: string;
  email: string | null;
  phone: string | null;
  reservationDate: string | null; // "YYYY-MM-DD"
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
    const name = nameIdx >= 0 ? (record[nameIdx] ?? "").trim() : "";
    if (!name) continue;
    rows.push({
      name,
      email: emailIdx >= 0 ? (record[emailIdx] ?? "").trim() || null : null,
      phone: phoneIdx >= 0 ? (record[phoneIdx] ?? "").trim() || null : null,
      reservationDate: dateIdx >= 0 ? toDateStr(record[dateIdx] ?? "") : null,
    });
  }

  return { rows, warnings };
}
