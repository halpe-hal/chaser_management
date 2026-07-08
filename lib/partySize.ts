// メール本文・CSVの各フィールドから人数（例:「2名」「2名様」）を推測する
export function detectPartySizeFromText(text: string): number | null {
  const m = text.match(/(\d+)\s*名/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

// 予約時点では同伴者の名前が分からないことが多いため、代表者名の末尾に人数を付記する
// （例: 2名の予約で1名分しか名前が取れない場合 → 「金子 郁恵(2)」）
export function withPartySizeSuffix(name: string, partySize: number | null): string {
  if (!partySize || partySize < 2) return name;
  if (/\(\d+\)$/.test(name)) return name;
  return `${name}(${partySize})`;
}
