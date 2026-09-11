import * as XLSX from "xlsx";

export type SalesRecord = { n: string; y: number; f: number; cd: string; b: number; p: number; m: number[] };
export type SalesData = { families: string[]; bands: string[]; records: SalesRecord[] };
const key = (r: SalesRecord) => `${r.y}\t${r.n}`;
const clean = (value: unknown) => String(value ?? "").trim();

export function validateSalesData(value: unknown): asserts value is SalesData {
  const d = value as SalesData;
  if (!d || !Array.isArray(d.families) || !Array.isArray(d.bands) || !Array.isArray(d.records) || !d.records.length || d.records.length > 40000 ||
    ![...d.families, ...d.bands].every(s => typeof s === "string" && s.length > 0 && s.length < 100) || d.families.length > 100 || d.bands.length !== 5) throw new Error("판매 데이터 형식이 올바르지 않습니다.");
  const seen = new Set<string>();
  for (const r of d.records) {
    if (!r || typeof r.n !== "string" || !r.n.trim() || r.n.length > 300 || typeof r.cd !== "string" || r.cd.length > 100 ||
      !Number.isInteger(r.y) || r.y < 2000 || r.y > 2100 || !Number.isInteger(r.f) || r.f < 0 || r.f >= d.families.length ||
      !Number.isInteger(r.b) || r.b < -1 || r.b >= d.bands.length || !Number.isFinite(r.p) || r.p < 0 || r.p > 1e9 ||
      !Array.isArray(r.m) || r.m.length !== 12 || !r.m.every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1e10) || seen.has(key(r))) throw new Error("판매 데이터에 잘못된 값 또는 중복 제품·연도가 있습니다.");
    seen.add(key(r));
  }
}

function numberCell(sheet: XLSX.WorkSheet, row: number, col: number, label: string): number {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (cell?.t === "e") throw new Error(`${label}: 엑셀 수식 오류를 수정한 뒤 다시 업로드하세요.`);
  const v = cell?.v;
  if (v == null || v === "" || v === "-") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || typeof v === "boolean") throw new Error(`${label}: 숫자가 아닌 값이 있습니다.`);
  return n;
}

/** Annual source sheets only; derived color-ratio sheets must never be counted twice. */
export function parseSalesWorkbook(book: XLSX.WorkBook, baseline: SalesData) {
  validateSalesData(baseline);
  const result = new Map(baseline.records.map(r => [key(r), r]));
  const metadata = new Map<string, SalesRecord>();
  for (const r of [...baseline.records].sort((a, b) => a.y - b.y)) metadata.set(r.n, r);
  const families = [...baseline.families];
  if (!families.includes("미표기")) families.push("미표기");
  const seen = new Set<string>();
  let added = 0, updated = 0, unchanged = 0, unclassified = 0;
  const years: number[] = [];
  for (const name of book.SheetNames) {
    if (!/^20\d{2}년?$/.test(name.trim())) continue;
    const year = parseInt(name, 10), sheet = book.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    if (range.e.r > 50000) throw new Error(`${name}: 행 수가 너무 많습니다.`);
    // This source has formatting all the way to XFD. Read only A:Q directly.
    const headers = Array.from({ length: 17 }, (_, c) => clean(sheet[XLSX.utils.encode_cell({ r: 0, c })]?.v).replace(/\s/g, ""));
    if (!Array.from({ length: 12 }, (_, i) => `${i + 1}월`).every((m, i) => headers[i + 2] === m)) throw new Error(`${name}: C~N열에 1월~12월 헤더가 필요합니다.`);
    const priceCol = headers.indexOf("공장도가");
    let count = 0;
    for (let row = 1; row <= range.e.r; row++) {
      const code = clean(sheet[`A${row + 1}`]?.v), n = clean(sheet[`B${row + 1}`]?.v);
      if ((!code && !n) || /^(총합계|합계|소계|총계)$/.test(n) || /^(총합계|합계|소계|총계)$/.test(code)) continue;
      if (!n) throw new Error(`${name} ${row + 1}행: 제품명이 없습니다.`);
      const id = `${year}\t${n}`;
      if (seen.has(id)) throw new Error(`${name} ${row + 1}행: 제품명 '${n}'이 중복되어 있습니다.`);
      seen.add(id);
      const old = result.get(id), meta = old || metadata.get(n);
      const m = Array.from({ length: 12 }, (_, c) => numberCell(sheet, row, c + 2, `${name} ${row + 1}행 ${c + 1}월`));
      const priceCell = priceCol < 0 ? null : sheet[XLSX.utils.encode_cell({ r: row, c: priceCol })];
      const p = priceCell?.v == null || priceCell.v === "" ? (meta?.p ?? 0) : numberCell(sheet, row, priceCol, `${name} ${row + 1}행 공장도가`);
      // Zero-only rows absent from the existing dataset carry no sales history.
      if (!old && m.every(v => v === 0)) continue;
      const r: SalesRecord = { n, y: year, m, p, f: meta?.f ?? families.indexOf("미표기"), cd: meta?.cd ?? "미표기", b: p <= 0 ? -1 : p < 1000 ? 0 : p < 3000 ? 1 : p < 8000 ? 2 : p < 20000 ? 3 : 4 };
      if (!meta) unclassified++;
      if (!old) added++;
      else if (JSON.stringify(old.m) !== JSON.stringify(m) || old.p !== p || old.b !== r.b) updated++;
      else unchanged++;
      result.set(id, r);
      count++;
    }
    if (!count) throw new Error(`${name}: 판매 데이터가 없습니다.`);
    years.push(year);
  }
  if (!years.length) throw new Error("2003년, 2026년처럼 연도로 이름 붙인 판매 시트가 없습니다.");
  const payload = { families, bands: [...baseline.bands], records: [...result.values()] };
  validateSalesData(payload);
  return { payload, summary: { added, updated, unchanged, unclassified, years } };
}
