import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseSalesWorkbook, readSalesWorkbook, type SalesData } from "./sales-import";

const baseline = (): SalesData => ({
  families: ["타월"], bands: ["1", "2", "3", "4", "5"],
  records: [
    { n: "제품A", y: 2026, f: 0, cd: "하늘", b: 1, p: 2000, m: [9, ...Array(11).fill(0)] },
    { n: "과거제품", y: 2021, f: 0, cd: "백색", b: 1, p: 2000, m: Array(12).fill(3) },
  ],
});
const header = ["코드", "제품명", ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`), "총합계", "평균판매", "공장도가"];
const row = (code: string, name: string, quantity: unknown, price: unknown = 2000) =>
  [code, name, quantity, ...Array(11).fill(0), null, null, price];
function book(rows: unknown[][], name = "2026년") {
  return { SheetNames: [name], Sheets: { [name]: XLSX.utils.aoa_to_sheet(rows) } };
}

describe("sales workbook import", () => {
  it("excludes standalone color notes and their old yearly aggregates only", () => {
    const before = baseline();
    before.records.push({ ...before.records[0], n: "하늘", y: 2024 }, { ...before.records[0], n: "하늘", y: 2023 });
    const result = parseSalesWorkbook(book([header, row("A", "제품A", 12), row("", "하늘", 999), row("", "하늘", 999)], "2024년"), before);
    expect(result.summary.removed).toBe(1);
    expect(result.payload.records.some(r => r.n === "하늘" && r.y === 2024)).toBe(false);
    expect(result.payload.records.some(r => r.n === "하늘" && r.y === 2023)).toBe(true);
    expect(result.summary.warnings.filter(w => w.includes("색상만"))).toHaveLength(2);
  });
  it("finds row 7 headers, ignores introductory figures, preserves other years", () => {
    const source = baseline();
    const original = JSON.stringify(source);
    const result = parseSalesWorkbook(book([...Array.from({ length: 6 }, () => ["", "", 999]), header, row("A", "제품A", 12)], "2022년"), source);
    expect(result.payload.records.find(r => r.y === 2022)?.m[0]).toBe(12);
    expect(result.payload.records.filter(r => r.y !== 2022)).toEqual(source.records);
    expect(JSON.stringify(source)).toBe(original);
    expect(result.summary.warnings[0]).toContain("1~6행");
  });
  it("reads annual sheets without loading a large auxiliary worksheet", () => {
    const source = book([header, row("A", "제품A", 1)]);
    source.SheetNames.push("Sheet1");
    source.Sheets["Sheet1"] = XLSX.utils.aoa_to_sheet([["보조"]]);
    const loaded = readSalesWorkbook(XLSX.write(source, { type: "array", bookType: "xlsx" }));
    expect(loaded.Sheets["2026년"]).toBeDefined();
    expect(loaded.Sheets["Sheet1"]).toBeUndefined();
    expect(parseSalesWorkbook(loaded, baseline()).summary.updated).toBe(1);
  });
  it("normalizes whitespace dashes while preserving returns as negative quantities", () => {
    const r = row("A", "제품A", " - ");
    r[3] = -3;
    const result = parseSalesWorkbook(book([header, r]), baseline());
    expect(result.payload.records[0].m.slice(0, 2)).toEqual([0, -3]);
  });
  it("sums distinct codes once per product and is idempotent", () => {
    const source = book([header, row("A", "제품A", 2), row("B", "제품A", 3)]);
    const result = parseSalesWorkbook(source, baseline());
    expect(result.payload.records[0].m[0]).toBe(5);
    expect(result.summary.updated).toBe(1);
    expect(result.summary.warnings.join()).toContain("합산");
    const again = parseSalesWorkbook(source, result.payload);
    expect(again.summary.updated).toBe(0);
    expect(again.payload).toEqual(result.payload);
  });
  it("rejects repeated active codes and conflicting active prices", () => {
    expect(() => parseSalesWorkbook(book([header, row("A", "제품A", 2), row("A", "제품A", 3)]), baseline())).toThrow("동일 제품코드");
    expect(() => parseSalesWorkbook(book([header, row("A", "제품A", 2), row("B", "제품A", 3, 3000)]), baseline())).toThrow("가격이 서로");
  });
  it("ignores zero-only new products before reading obsolete error prices", () => {
    const source = book([header, row("A", "제품A", 2), row("B", "옛제품", 0)]);
    source.Sheets["2026년"].Q3 = { t: "e", v: 42 };
    expect(parseSalesWorkbook(source, baseline()).summary.added).toBe(0);
  });
  it("keeps existing prices for zero or blank cells and reports zero-price fallback", () => {
    const result = parseSalesWorkbook(book([header, row("A", "제품A", 12, 0)]), baseline());
    expect(result.payload.records[0].p).toBe(2000);
    expect(result.summary.warnings.join()).toContain("기존 가격");
    expect(parseSalesWorkbook(book([header, row("A", "제품A", 12, null)]), baseline()).payload.records[0].p).toBe(2000);
  });
  it("preserves a valid old price for an error and reports the exact row", () => {
    const source = book([header, row("A", "제품A", 2)]);
    source.Sheets["2026년"].Q2 = { t: "e", v: 42 };
    const result = parseSalesWorkbook(source, baseline());
    expect(result.payload.records[0].p).toBe(2000);
    expect(result.summary.warnings[0]).toContain("2행");
    source.Sheets["2026년"].B2.v = "신제품";
    expect(() => parseSalesWorkbook(source, baseline())).toThrow("유지할 기존 가격이 없습니다");
  });
  it("rejects quantity formula errors and malformed headers", () => {
    const source = book([header, row("A", "제품A", 2)]);
    source.Sheets["2026년"].C2 = { t: "e", v: 42 };
    expect(() => parseSalesWorkbook(source, baseline())).toThrow("1월");
    expect(() => parseSalesWorkbook(book([["제품명"], row("A", "제품A", 2)]), baseline())).toThrow("헤더");
  });
  it("clears existing sales with explicit zero rows and handles inactive duplicates", () => {
    const result = parseSalesWorkbook(book([header, row("A", "제품A", 0), row("A", "제품A", 0)]), baseline());
    expect(result.payload.records[0].m.every(n => n === 0)).toBe(true);
    expect(result.summary.updated).toBe(1);
  });
});