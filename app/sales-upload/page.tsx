"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SalesData } from "@/lib/sales-import";

type Shared = { payload: SalesData; updated_at: string | null; available: boolean; message?: string };
type Preview = Awaited<ReturnType<typeof import("@/lib/sales-import").parseSalesWorkbook>>;

export default function SalesUpload() {
  const [shared, setShared] = useState<Shared | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("공용 판매 데이터를 확인하고 있습니다…");
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/sales-dashboard", { cache: "no-store" }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (active) { setShared(data); setMessage(data.message || "파일을 선택하면 저장 전에 변경 건수를 확인할 수 있습니다."); }
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, []);

  async function select(file?: File) {
    setPreview(null);
    if (!file || !shared) return;
    setFilename(file.name);
    if (!/\.xlsx?$/i.test(file.name) || file.size > 20 * 1024 * 1024) { setMessage("20MB 이하의 xlsx 또는 xls 파일을 선택하세요."); return; }
    setBusy(true); setMessage("엑셀을 읽고 있습니다…");
    try {
      const XLSX = await import("xlsx");
      const { parseSalesWorkbook } = await import("@/lib/sales-import");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellFormula: false, cellStyles: false, sheetRows: 50002 });
      const parsed = parseSalesWorkbook(book, shared.payload);
      if (new TextEncoder().encode(JSON.stringify(parsed.payload)).length > 3400000) throw new Error("변환된 데이터가 너무 큽니다. 관리자에게 문의하세요.");
      setPreview(parsed); setMessage("아직 저장하지 않았습니다. 아래 내용을 확인한 뒤 팀 공용 저장을 누르세요.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "엑셀을 읽지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!preview || !shared?.available) return;
    setBusy(true); setMessage("팀 공용 데이터로 저장하고 있습니다…");
    try {
      let member = "";
      try { member = localStorage.getItem("team-dashboard:member") || ""; } catch {}
      const response = await fetch("/api/sales-dashboard", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: preview.payload, expectedVersion: shared.updated_at, updatedBy: member }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "저장에 실패했습니다.");
      window.location.assign("/sales-dashboard.html");
    } catch (e) { setMessage(e instanceof Error ? e.message : "저장에 실패했습니다."); setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl p-6 py-12">
    <Link href="/sales-dashboard.html" className="underline">← 판매 대시보드</Link>
    <h1 className="mt-6 text-2xl font-bold">판매 엑셀 업로드</h1>
    <p className="my-4 text-sm leading-7">연도별 시트(예: 2026년)의 B열 제품명, C~N열 월별 판매수량, 공장도가를 읽습니다. 파일에 있는 제품·연도만 갱신하며 나머지 이력은 보존합니다. 빈 월은 0으로 반영합니다. 색상과 기존 가격 정보는 유지하고, 새 제품의 색상은 미표기로 표시합니다.</p>
    <label className="block rounded-lg border p-4">판매 엑셀 파일
      <input className="mt-3 block w-full text-sm" type="file" accept=".xlsx,.xls" disabled={!shared || busy} onChange={e => { void select(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
    <p role="status" aria-live="polite" className="my-4 rounded-lg bg-slate-100 p-4 text-sm text-slate-900">{message}</p>
    {shared && !shared.available && <p className="my-4 text-sm text-red-700">공용 저장소 설정이 필요합니다. 파일 검토는 가능하며 저장 버튼은 설정 후 사용할 수 있습니다.</p>}
    {preview && <section className="rounded-lg border p-5">
      <h2 className="font-bold">저장 전 확인</h2><p className="my-2 break-all text-sm">{filename}</p>
      <p className="text-sm">{preview.summary.years.join(", ")}년</p>
      <dl className="my-4 grid grid-cols-3 gap-3 text-center">
        <div><dt>신규</dt><dd className="text-xl font-bold">{preview.summary.added}</dd></div>
        <div><dt>갱신</dt><dd className="text-xl font-bold">{preview.summary.updated}</dd></div>
        <div><dt>동일</dt><dd className="text-xl font-bold">{preview.summary.unchanged}</dd></div>
      </dl>
      {!!preview.summary.unclassified && <p className="mb-4 text-sm">새 제품 {preview.summary.unclassified}건은 색상 미표기로 저장됩니다.</p>}
      <p className="mb-4 text-sm">저장 후 팀원이 판매 화면을 열거나 새로고침하면 같은 데이터를 봅니다.</p>
      <button className="rounded-md bg-slate-900 px-5 py-3 text-white disabled:opacity-40" disabled={busy || !shared?.available} onClick={() => void save()}>팀 공용 저장</button>
      <button className="ml-3 rounded-md border px-5 py-3" disabled={busy} onClick={() => { setPreview(null); setMessage("업로드를 취소했습니다. 기존 데이터는 유지됩니다."); }}>취소</button>
    </section>}
  </main>;
}
