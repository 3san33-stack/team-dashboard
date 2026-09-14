import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diaryWeek, emptyDiary } from "./diary";

const state = vi.hoisted(() => ({ responses: [] as unknown[], from: vi.fn(), eq: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: state.from } }));
import { PersonalDiary } from "@/components/personal-diary";

let host: HTMLDivElement, root: Root;
const key = () => `team-dashboard:diary:구민석:${diaryWeek(new Date())}`;
const draft = () => ({ content: { ...emptyDiary(), notes: "복원할 메모" }, revision: 2 });
async function render() { await act(async () => { root.render(createElement(PersonalDiary, { member: "구민석" })); }); }
async function save() { const button = [...host.querySelectorAll("button")].find(b => b.textContent === "기록 저장")!; await act(async () => { button.click(); }); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.responses.length = 0;
  vi.clearAllMocks(); localStorage.clear();
  const query = { select: vi.fn(), eq: state.eq, insert: state.insert, update: state.update, maybeSingle: vi.fn(async () => state.responses.shift()) };
  query.select.mockReturnValue(query); state.eq.mockReturnValue(query); state.insert.mockReturnValue(query); state.update.mockReturnValue(query); state.from.mockReturnValue(query);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); localStorage.clear(); });

describe("personal diary persistence", () => {
  it("loads only the selected member and week", async () => {
    state.responses.push({ data: null, error: null }); await render();
    expect(state.eq).toHaveBeenCalledWith("member", "구민석");
    expect(state.eq).toHaveBeenCalledWith("week_start", diaryWeek(new Date()));
    expect(host.querySelectorAll("textarea")).toHaveLength(8);
  });
  it("keeps the original revision on recovered drafts and preserves text on conflict", async () => {
    localStorage.setItem(key(), JSON.stringify(draft()));
    state.responses.push({data:{content:emptyDiary(),revision:3,updated_at:new Date().toISOString()},error:null},{data:null,error:null});
    await render(); await save();
    expect(state.eq).toHaveBeenCalledWith("revision",2);
    expect(host.textContent).toContain("다른 창에서 먼저 저장");
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("복원할 메모");
    expect(localStorage.getItem(key())).not.toBeNull();
  });
  it("clears only the current member/week draft after a successful save", async () => {
    localStorage.setItem(key(), JSON.stringify(draft())); localStorage.setItem("another-diary", "keep");
    state.responses.push({data:{content:emptyDiary(),revision:2,updated_at:new Date().toISOString()},error:null},{data:{revision:3,updated_at:new Date().toISOString()},error:null});
    await render(); await save();
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({content:draft().content,revision:3}));
    expect(localStorage.getItem(key())).toBeNull(); expect(localStorage.getItem("another-diary")).toBe("keep");
    expect(host.textContent).toContain("저장 완료");
  });
  it("does not save when the table is missing and restores a local draft", async () => {
    localStorage.setItem(key(),JSON.stringify(draft()));
    state.responses.push({data:null,error:{code:"PGRST205"}}); await render(); await save();
    expect(state.update).not.toHaveBeenCalled(); expect(state.insert).not.toHaveBeenCalled();
    expect(host.textContent).toContain("저장소 설정이 필요");
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("복원할 메모");
  });
});
