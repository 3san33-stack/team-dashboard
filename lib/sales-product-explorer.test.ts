import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import type { SalesRecord } from "./sales-import";

type Point = { year: number; quantity: number | null; revenue: number | null };
type Explorer = {
  findProducts: (rows: SalesRecord[], query: string) => string[];
  annualSeries: (rows: SalesRecord[], name: string, month?: number) => Point[];
  mount: (data: { records: SalesRecord[] }) => void;
};
const js = readFileSync("public/sales-product-explorer.js", "utf8");
const html = readFileSync("public/sales-dashboard.html", "utf8");
const globals = globalThis as unknown as { SalesProductExplorer: Explorer; Chart: unknown };
const record = (n: string, y: number, m: number[], p = 1000): SalesRecord =>
  ({ n, y, m: [...m, ...Array(12 - m.length).fill(0)], p, f: 0, b: 1, cd: "하늘" });
const rows = [
  record("송월 코마40.하늘", 2023, [10, 20]),
  record("송월 코마40.하늘", 2025, [0, 0]),
  record("송월 코마40.하늘", 2026, [5, 7], 2000),
  record("다른상품", 2024, [1]),
  record("샤워 상품", 2025, [3]),
];
beforeEach(() => { new Function(js)(); });
describe("product sales explorer", () => {
  it("finds partial names ignoring spaces and includes categories excluded from overview", () => {
    expect(globals.SalesProductExplorer.findProducts(rows, "코마 40")).toEqual(["송월 코마40.하늘"]);
    expect(globals.SalesProductExplorer.findProducts(rows, "샤워")).toEqual(["샤워 상품"]);
    expect(globals.SalesProductExplorer.findProducts(rows, "없음")).toEqual([]);
    expect(globals.SalesProductExplorer.findProducts(rows, " ")).toEqual([]);
  });
  it("distinguishes missing years from recorded zeros and applies a matching month range", () => {
    const series = globals.SalesProductExplorer.annualSeries(rows, "송월 코마40.하늘", 1);
    expect(series).toEqual([
      { year: 2023, quantity: 10, revenue: 10000 },
      { year: 2024, quantity: null, revenue: null },
      { year: 2025, quantity: 0, revenue: 0 },
      { year: 2026, quantity: 5, revenue: 10000 },
    ]);
    expect(globals.SalesProductExplorer.annualSeries(rows, "없음")).toEqual([]);
  });
  it("aggregates duplicate records and does not invent revenue without a price", () => {
    const source = [record("A", 2026, [4], 1000), record("A", 2026, [-1], 0)];
    expect(globals.SalesProductExplorer.annualSeries(source, "A")).toEqual([{ year: 2026, quantity: 3, revenue: null }]);
  });
  it("selects products and updates the chart and table through real controls", () => {
    document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
    const destroy = vi.fn();
    const chart = vi.fn(function () { return { destroy }; });
    globals.Chart = chart;
    globals.SalesProductExplorer.mount({ records: rows });
    const search = document.getElementById("productSearch") as HTMLInputElement;
    search.value = "코마"; search.dispatchEvent(new Event("input"));
    (document.querySelector(".product-result") as HTMLButtonElement).click();
    expect(document.getElementById("productPicker")?.hidden).toBe(true);
    (document.getElementById("productChange") as HTMLButtonElement).click();
    expect(document.getElementById("productPicker")?.hidden).toBe(false);
    expect(document.getElementById("productSelected")?.textContent).toBe("송월 코마40.하늘");
    expect(document.getElementById("productYearBody")?.textContent).toContain("12개");
    expect(document.getElementById("productYearBody")?.textContent).toContain("기록 없음");
    const period = document.getElementById("productThroughMonth") as HTMLSelectElement;
    period.value = "1"; period.dispatchEvent(new Event("change"));
    expect(document.getElementById("productYearBody")?.textContent).toContain("5개");
    expect(destroy).toHaveBeenCalledOnce();
    expect(chart).toHaveBeenCalledTimes(2);
    search.value = "다른"; search.dispatchEvent(new Event("input"));
    expect(document.getElementById("productDetail")?.hidden).toBe(true);
  });
  it("paginates compact results without hiding later matches", () => {
    document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
    globals.SalesProductExplorer.mount({ records: Array.from({ length: 19 }, (_, i) => record("상품" + String(i).padStart(2, "0"), 2026, [1])) });
    const search = document.getElementById("productSearch") as HTMLInputElement;
    search.value = "상품"; search.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll(".product-result")).toHaveLength(8);
    expect((document.getElementById("productPrevious") as HTMLButtonElement).disabled).toBe(true);
    (document.getElementById("productMore") as HTMLButtonElement).click();
    expect(document.querySelector(".product-result")?.textContent).toBe("상품08");
    (document.getElementById("productMore") as HTMLButtonElement).click();
    expect(document.querySelectorAll(".product-result")).toHaveLength(3);
    expect((document.getElementById("productMore") as HTMLButtonElement).disabled).toBe(true);
    search.value = "상품00"; search.dispatchEvent(new Event("input"));
    expect(document.querySelector(".product-result")?.textContent).toBe("상품00");
    expect(document.getElementById("productPagination")?.hidden).toBe(true);
  });
  it("renders untrusted product names as text", () => {
    document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
    globals.SalesProductExplorer.mount({ records: [record("<img src=x onerror=alert(1)>", 2026, [1])] });
    const search = document.getElementById("productSearch") as HTMLInputElement;
    search.value = "<img"; search.dispatchEvent(new Event("input"));
    expect(document.querySelector("#productResults img")).toBeNull();
    expect(document.querySelector(".product-result")?.textContent).toContain("<img");
  });
  it("keeps the existing inline dashboard JavaScript syntactically valid", () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    expect(inline.length).toBeGreaterThan(0);
    inline.forEach(script => expect(() => new Script(script)).not.toThrow());
  });
});