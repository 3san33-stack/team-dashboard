import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({responses:[] as unknown[],from:vi.fn(),eq:vi.fn(),insert:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/supabase",()=>({supabase:{from:state.from}}));
import { UploadDayNote } from "@/components/upload-day-note";
let host:HTMLDivElement,root:Root;
const key="team-dashboard:upload-note:2026-09-14";
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();vi.clearAllMocks();state.responses.length=0;
  const q={select:vi.fn(),eq:state.eq,insert:state.insert,update:state.update,maybeSingle:vi.fn(async()=>state.responses.shift())};
  q.select.mockReturnValue(q);state.eq.mockReturnValue(q);state.insert.mockReturnValue(q);state.update.mockReturnValue(q);state.from.mockReturnValue(q);
  host=document.createElement("div");document.body.appendChild(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();localStorage.clear();});
async function render(){await act(async()=>root.render(createElement(UploadDayNote,{date:"2026-09-14"})));}
async function save(){await act(async()=>{[...host.querySelectorAll("button")].find(b=>b.textContent==="메모 저장")!.click();});}
it("restores a draft and inserts it for the correct date without changing counts",async()=>{
  localStorage.setItem(key,JSON.stringify({note:"샘플 수정",revision:null}));
  state.responses.push({data:null,error:null},{data:{revision:1},error:null});
  await render();await save();
  expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({date:"2026-09-14",note:"샘플 수정",revision:1}));
  expect(state.from.mock.calls.every(c=>c[0]==="upload_day_notes")).toBe(true);
  expect(localStorage.getItem(key)).toBeNull();
});
it("retains the draft if another editor saved first",async()=>{
  localStorage.setItem(key,JSON.stringify({note:"내 메모",revision:1}));
  state.responses.push({data:{note:"다른 메모",revision:2},error:null},{data:null,error:null});
  await render();await save();
  expect(state.eq).toHaveBeenCalledWith("revision",1);
  expect(host.textContent).toContain("다른 화면에서 먼저 저장");
  expect(localStorage.getItem(key)).not.toBeNull();
});
it("blocks saving if the note table has not been configured",async()=>{
  state.responses.push({data:null,error:{code:"PGRST205"}});await render();await save();
  expect(host.textContent).toContain("저장소 설정이 필요");expect(state.insert).not.toHaveBeenCalled();
});
